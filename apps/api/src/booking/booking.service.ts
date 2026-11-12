import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { MAX_EXTRA_SERVICES, entitlementsFor, resolvePlan } from '@moonlight/schemas';
import type {
  AddServiceInput,
  AddableService,
  BookingConfirmation,
  BookingSettings,
  BookingSettingsInput,
  BookingSlot,
  BookingsListQuery,
  CreateBookingInput,
  LookupBookingInput,
  ManagedBooking,
  OwnerBooking,
  OwnerBookingsPage,
  PublicBookingInfo,
  SlotsQuery,
} from '@moonlight/schemas';
import { EntitlementsService } from '../billing/entitlements.service';
import { MailPort, type BookingLinkItem, type BookingMailDetails } from '../mail/mail.port';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../redis/rate-limit.service';
import {
  addDays,
  formatInZone,
  isRealDate,
  localDate,
  localMinuteOfDay,
  toIcsDate,
  weekdayInZone,
  weekdayOf,
  zonedTimeToUtc,
} from './booking.time';

const MIN_NOTICE_HOURS = 2;
const MAX_DAYS_AHEAD = 60;
const BOOK_LIMIT_PER_HOUR = 10;
const MANAGE_READS_PER_10_MIN = 120;
const MANAGE_WRITES_PER_10_MIN = 30;
const LOOKUPS_PER_HOUR_PER_IP = 5;
const LOOKUPS_PER_HOUR_PER_EMAIL = 3;
const LOOKUP_BOOKINGS_LIMIT = 5;

type BookableTenant = Prisma.TenantGetPayload<{
  include: {
    owner: { select: { email: true; subscription: { select: { plan: true; status: true } } } };
    availability: true;
    bookingServices: true;
  };
}>;

type ManagedRow = Prisma.BookingGetPayload<{
  include: {
    service: true;
    extras: true;
    tenant: {
      include: {
        owner: { select: { email: true; subscription: { select: { plan: true; status: true } } } };
        availability: true;
        bookingServices: true;
      };
    };
  };
}>;

type ServiceLine = { name: string; durationMinutes: number };

const managedInclude = {
  service: true,
  extras: { orderBy: { createdAt: 'asc' } },
  tenant: {
    include: {
      owner: { select: { email: true, subscription: { select: { plan: true, status: true } } } },
      availability: true,
      bookingServices: { where: { active: true }, orderBy: { createdAt: 'asc' } },
    },
  },
} satisfies Prisma.BookingInclude;

function isOverlapViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('bookings_no_overlap') || message.includes('23P01');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailPort,
    private readonly rateLimit: RateLimitService,
    private readonly entitlements: EntitlementsService,
    config: ConfigService,
  ) {
    this.webUrl = config.get<string>('WEB_URL', 'http://localhost:3000').replace(/\/$/, '');
  }

  async getSettings(ownerId: string): Promise<BookingSettings> {
    const tenant = await this.ownerTenant(ownerId);
    const [services, rules] = await Promise.all([
      this.prisma.bookingService.findMany({
        where: { tenantId: tenant.id, active: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.availabilityRule.findMany({
        where: { tenantId: tenant.id },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      }),
    ]);

    return {
      enabled: tenant.bookingEnabled,
      timezone: tenant.timezone,
      cancelNoticeHours: tenant.cancelNoticeHours,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
      })),
      rules: rules.map((r) => ({
        weekday: r.weekday,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
      })),
    };
  }

  async saveSettings(ownerId: string, input: BookingSettingsInput): Promise<BookingSettings> {
    const tenant = await this.ownerTenant(ownerId);
    if (input.enabled) {
      await this.entitlements.assertBookingServices(ownerId, input.services.length);
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.bookingService.findMany({ where: { tenantId: tenant.id } });
      const existingIds = new Set(existing.map((s) => s.id));
      const keptIds = new Set<string>();

      for (const service of input.services) {
        if (service.id) {
          if (!existingIds.has(service.id)) throw new BadRequestException('Serviço inválido');
          keptIds.add(service.id);
          await tx.bookingService.update({
            where: { id: service.id },
            data: { name: service.name, durationMinutes: service.durationMinutes, active: true },
          });
        } else {
          await tx.bookingService.create({
            data: {
              tenantId: tenant.id,
              name: service.name,
              durationMinutes: service.durationMinutes,
            },
          });
        }
      }

      const removed = existing.filter((s) => s.active && !keptIds.has(s.id)).map((s) => s.id);
      if (removed.length > 0) {
        await tx.bookingService.updateMany({
          where: { id: { in: removed } },
          data: { active: false },
        });
      }

      await tx.availabilityRule.deleteMany({ where: { tenantId: tenant.id } });
      if (input.rules.length > 0) {
        await tx.availabilityRule.createMany({
          data: input.rules.map((rule) => ({ ...rule, tenantId: tenant.id })),
        });
      }

      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          bookingEnabled: input.enabled,
          timezone: input.timezone,
          cancelNoticeHours: input.cancelNoticeHours,
        },
      });
    });

    return this.getSettings(ownerId);
  }

  async listBookings(ownerId: string, query: BookingsListQuery): Promise<OwnerBookingsPage> {
    const tenant = await this.ownerTenant(ownerId);
    const now = new Date();

    const startsAt: Prisma.DateTimeFilter = {};
    if (query.from && isRealDate(query.from)) {
      startsAt.gte = zonedTimeToUtc(query.from, 0, tenant.timezone);
    }
    if (query.to && isRealDate(query.to)) {
      startsAt.lt = zonedTimeToUtc(addDays(query.to, 1), 0, tenant.timezone);
    }

    const where: Prisma.BookingWhereInput = { tenantId: tenant.id };
    if (query.scope === 'upcoming') where.endsAt = { gte: now };
    if (query.scope === 'past') where.endsAt = { lt: now };
    if (Object.keys(startsAt).length > 0) where.startsAt = startsAt;
    if (query.status !== 'all') where.status = query.status;
    if (query.q) {
      where.OR = [
        { customerName: { contains: query.q, mode: 'insensitive' } },
        { customerEmail: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.serviceId) {
      const serviceFilter: Prisma.BookingWhereInput[] = [
        { serviceId: query.serviceId },
        { extras: { some: { serviceId: query.serviceId } } },
      ];
      where.AND = [{ OR: serviceFilter }];
    }

    const total = await this.prisma.booking.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);

    const rows = await this.prisma.booking.findMany({
      where,
      orderBy: { startsAt: query.scope === 'upcoming' ? 'asc' : 'desc' },
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
      include: { service: true, extras: { orderBy: { createdAt: 'asc' } } },
    });

    const items: OwnerBooking[] = rows.map((row) => {
      const services = this.serviceLines(row);
      return {
        id: row.id,
        serviceName: services.map((s) => s.name).join(' + '),
        services,
        totalMinutes: services.reduce((sum, s) => sum + s.durationMinutes, 0),
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        notes: row.notes,
        status: row.status,
        cancelledBy: row.cancelledBy,
      };
    });

    return { items, total, page, pageSize: query.pageSize, totalPages };
  }

  async cancelBooking(ownerId: string, bookingId: string) {
    const tenant = await this.ownerTenant(ownerId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenant.id },
      include: { service: true, extras: { orderBy: { createdAt: 'asc' } } },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada');
    if (booking.status === 'CANCELLED') return;

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'OWNER' },
    });

    await this.safeSend(() =>
      this.mail.sendBookingCancellation(
        booking.customerEmail,
        this.mailDetails(tenant.name, tenant.timezone, booking),
      ),
    );
  }

  async getPublicInfo(slug: string): Promise<PublicBookingInfo> {
    const tenant = await this.bookableTenant(slug);
    return {
      slug: tenant.slug,
      name: tenant.name,
      timezone: tenant.timezone,
      services: tenant.bookingServices
        .filter((s) => s.active)
        .map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes })),
      maxDaysAhead: MAX_DAYS_AHEAD,
      cancelNoticeHours: tenant.cancelNoticeHours,
    };
  }

  async getSlots(slug: string, query: SlotsQuery): Promise<BookingSlot[]> {
    if (!isRealDate(query.from)) throw new BadRequestException('Data inválida');
    const tenant = await this.bookableTenant(slug);
    const { total } = this.resolveSelection(tenant, query.serviceId, query.extraIds);
    return this.computeSlots(tenant, total, query.from, query.days, new Date());
  }

  async book(slug: string, input: CreateBookingInput, ip: string): Promise<BookingConfirmation> {
    const allowed = await this.rateLimit.allow(`book:${ip}`, BOOK_LIMIT_PER_HOUR, 3600);
    if (!allowed) throw new HttpException('Muitas reservas', HttpStatus.TOO_MANY_REQUESTS);

    const tenant = await this.bookableTenant(slug);
    const { primary, extras, total } = this.resolveSelection(
      tenant,
      input.serviceId,
      input.extraServiceIds,
    );
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + total * 60_000);

    const date = localDate(startsAt, tenant.timezone);
    const slots = await this.computeSlots(tenant, total, date, 1, new Date());
    if (!slots.some((slot) => slot.startsAt === startsAt.toISOString())) {
      throw new ConflictException('Horário indisponível');
    }

    const token = newToken();
    let booking;
    try {
      booking = await this.prisma.booking.create({
        data: {
          tenantId: tenant.id,
          serviceId: primary.id,
          startsAt,
          endsAt,
          customerName: input.name,
          customerEmail: input.email,
          notes: input.notes || null,
          manageTokenHash: hashToken(token),
          extras: {
            create: extras.map((extra) => ({
              serviceId: extra.id,
              name: extra.name,
              durationMinutes: extra.durationMinutes,
            })),
          },
        },
        include: { service: true, extras: { orderBy: { createdAt: 'asc' } } },
      });
    } catch (error) {
      if (isOverlapViolation(error)) throw new ConflictException('Horário indisponível');
      throw error;
    }

    const details = this.mailDetails(
      tenant.name,
      tenant.timezone,
      booking,
      this.manageUrl(tenant.slug, token),
    );
    await this.safeSend(() => this.mail.sendBookingConfirmation(booking.customerEmail, details));
    await this.safeSend(() =>
      this.mail.sendBookingNotification(tenant.owner.email, { ...details, manageUrl: undefined }),
    );

    const services = this.serviceLines(booking);
    return {
      id: booking.id,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      serviceName: services.map((s) => s.name).join(' + '),
      services,
      totalMinutes: total,
      manageToken: token,
    };
  }

  async getManaged(token: string, ip: string): Promise<ManagedBooking> {
    await this.throttle(ip, 'read');
    const booking = await this.findByToken(token);
    return this.toManaged(booking, new Date());
  }

  async cancelManaged(token: string, ip: string): Promise<ManagedBooking> {
    await this.throttle(ip, 'write');
    const booking = await this.findByToken(token);
    const now = new Date();
    const view = await this.toManaged(booking, now);

    if (view.status === 'CANCELLED') return view;
    if (view.status === 'COMPLETED') {
      throw new ForbiddenException('Esta reserva já aconteceu e não pode mais ser cancelada.');
    }
    if (!view.canCancel) {
      throw new ForbiddenException(
        `O prazo para cancelar online terminou (${this.noticeLabel(booking.tenant.cancelNoticeHours)}). Entre em contato com ${booking.tenant.name}.`,
      );
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'CUSTOMER' },
    });

    const details = this.mailDetails(booking.tenant.name, booking.tenant.timezone, booking);
    await this.safeSend(() => this.mail.sendBookingCancellation(booking.customerEmail, details));
    await this.safeSend(() =>
      this.mail.sendBookingCancelledByCustomer(booking.tenant.owner.email, details),
    );

    return this.toManaged(await this.findByToken(token), new Date());
  }

  async addService(token: string, input: AddServiceInput, ip: string): Promise<ManagedBooking> {
    await this.throttle(ip, 'write');
    const booking = await this.findByToken(token);
    const now = new Date();
    const view = await this.toManaged(booking, now);

    if (!view.canAddServices) {
      throw new ForbiddenException('Não é possível adicionar serviços a esta reserva.');
    }
    const option = view.addable.find((item) => item.id === input.serviceId);
    if (!option) throw new NotFoundException('Serviço não encontrado');
    if (!option.available) {
      throw new ConflictException(
        'Não há horário livre logo depois da sua reserva para este serviço.',
      );
    }

    const newEnd = new Date(booking.endsAt.getTime() + option.durationMinutes * 60_000);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.bookingExtra.create({
          data: {
            bookingId: booking.id,
            serviceId: option.id,
            name: option.name,
            durationMinutes: option.durationMinutes,
          },
        });
        await tx.booking.update({ where: { id: booking.id }, data: { endsAt: newEnd } });
      });
    } catch (error) {
      if (isOverlapViolation(error)) {
        throw new ConflictException(
          'Esse horário acabou de ser ocupado. Tente outro serviço ou entre em contato.',
        );
      }
      throw error;
    }

    const updated = await this.findByToken(token);
    await this.notifyChange(updated, `serviço adicionado: ${option.name}`);
    return this.toManaged(updated, new Date());
  }

  async removeExtra(token: string, extraId: string, ip: string): Promise<ManagedBooking> {
    await this.throttle(ip, 'write');
    const booking = await this.findByToken(token);
    const view = await this.toManaged(booking, new Date());
    if (!view.canRemoveServices) {
      throw new ForbiddenException('Não é mais possível remover serviços desta reserva.');
    }
    const extra = booking.extras.find((item) => item.id === extraId);
    if (!extra) throw new NotFoundException('Serviço não encontrado na reserva');

    const newEnd = new Date(booking.endsAt.getTime() - extra.durationMinutes * 60_000);
    await this.prisma.$transaction(async (tx) => {
      await tx.bookingExtra.delete({ where: { id: extra.id } });
      await tx.booking.update({ where: { id: booking.id }, data: { endsAt: newEnd } });
    });

    const updated = await this.findByToken(token);
    await this.notifyChange(updated, `serviço removido: ${extra.name}`);
    return this.toManaged(updated, new Date());
  }

  async calendarFile(token: string, ip: string): Promise<string> {
    await this.throttle(ip, 'read');
    const booking = await this.findByToken(token);
    const now = new Date();
    if (booking.status !== 'CONFIRMED' || booking.endsAt < now) {
      throw new NotFoundException('Reserva não encontrada');
    }

    const services = this.serviceLines(booking);
    const names = services.map((s) => s.name).join(' + ');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Moonlight//Agenda//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${booking.id}@moonlight`,
      `DTSTAMP:${toIcsDate(now)}`,
      `DTSTART:${toIcsDate(booking.startsAt)}`,
      `DTEND:${toIcsDate(booking.endsAt)}`,
      `SUMMARY:${icsEscape(`${names} - ${booking.tenant.name}`)}`,
      `DESCRIPTION:${icsEscape(`Reserva com ${booking.tenant.name}.\n${services.map((s) => `${s.name} (${s.durationMinutes} min)`).join('\n')}\nGerenciar: ${this.manageUrl(booking.tenant.slug, token)}`)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return lines.join('\r\n') + '\r\n';
  }

  async lookup(slug: string, input: LookupBookingInput, ip: string): Promise<void> {
    const byIp = await this.rateLimit.allow(`lookup:ip:${ip}`, LOOKUPS_PER_HOUR_PER_IP, 3600);
    if (!byIp) throw new HttpException('Muitas tentativas', HttpStatus.TOO_MANY_REQUESTS);
    const byEmail = await this.rateLimit.allow(
      `lookup:email:${input.email}`,
      LOOKUPS_PER_HOUR_PER_EMAIL,
      3600,
    );
    if (!byEmail) return;

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true, slug: true, name: true, timezone: true },
    });
    if (!tenant) return;

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        status: 'CONFIRMED',
        endsAt: { gt: new Date() },
        customerEmail: { equals: input.email, mode: 'insensitive' },
      },
      orderBy: { startsAt: 'asc' },
      take: LOOKUP_BOOKINGS_LIMIT,
      include: { service: true, extras: { orderBy: { createdAt: 'asc' } } },
    });
    if (bookings.length === 0) return;

    const items: BookingLinkItem[] = [];
    for (const booking of bookings) {
      const token = newToken();
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { manageTokenHash: hashToken(token) },
      });
      items.push({
        when: formatInZone(booking.startsAt, tenant.timezone),
        serviceName: this.serviceLines(booking)
          .map((s) => s.name)
          .join(' + '),
        url: this.manageUrl(tenant.slug, token),
      });
    }

    await this.safeSend(() => this.mail.sendBookingLinks(input.email, tenant.name, items));
  }

  private resolveSelection(tenant: BookableTenant, primaryId: string, extraIds: string[]) {
    const primary = this.findActiveService(tenant, primaryId);
    const uniqueExtras = [...new Set(extraIds)].filter((id) => id !== primary.id);
    if (uniqueExtras.length > MAX_EXTRA_SERVICES) {
      throw new BadRequestException('Serviços demais em uma única reserva');
    }
    const extras = uniqueExtras.map((id) => this.findActiveService(tenant, id));
    const total = [primary, ...extras].reduce((sum, s) => sum + s.durationMinutes, 0);
    return { primary, extras, total };
  }

  private async computeSlots(
    tenant: BookableTenant,
    durationMinutes: number,
    from: string,
    days: number,
    now: Date,
  ): Promise<BookingSlot[]> {
    const today = localDate(now, tenant.timezone);
    const lastAllowed = addDays(today, MAX_DAYS_AHEAD - 1);
    const firstDate = from < today ? today : from;
    const lastDate = (() => {
      const requested = addDays(firstDate, days - 1);
      return requested > lastAllowed ? lastAllowed : requested;
    })();
    if (firstDate > lastDate) return [];

    const rangeStart = zonedTimeToUtc(firstDate, 0, tenant.timezone);
    const rangeEnd = zonedTimeToUtc(addDays(lastDate, 1), 0, tenant.timezone);
    const taken = await this.prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        status: 'CONFIRMED',
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    });

    const earliest = now.getTime() + MIN_NOTICE_HOURS * 3_600_000;
    const slots: BookingSlot[] = [];

    for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
      const windows = tenant.availability
        .filter((rule) => rule.weekday === weekdayOf(date))
        .sort((a, b) => a.startMinute - b.startMinute);

      for (const window of windows) {
        for (
          let minute = window.startMinute;
          minute + durationMinutes <= window.endMinute;
          minute += durationMinutes
        ) {
          const startsAt = zonedTimeToUtc(date, minute, tenant.timezone);
          const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
          if (startsAt.getTime() < earliest) continue;
          if (taken.some((b) => b.startsAt < endsAt && b.endsAt > startsAt)) continue;
          slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
        }
      }
    }

    return slots;
  }

  private async toManaged(booking: ManagedRow, now: Date): Promise<ManagedBooking> {
    const tenant = booking.tenant;
    const status =
      booking.status === 'CANCELLED'
        ? 'CANCELLED'
        : booking.endsAt.getTime() < now.getTime()
          ? 'COMPLETED'
          : 'CONFIRMED';
    const active = status === 'CONFIRMED';
    const deadline = new Date(booking.startsAt.getTime() - tenant.cancelNoticeHours * 3_600_000);
    const canCancel = active && now.getTime() <= deadline.getTime();
    const bookingOpen =
      tenant.bookingEnabled && entitlementsFor(resolvePlan(tenant.owner.subscription)).booking;
    const canAddServices =
      active &&
      bookingOpen &&
      now.getTime() < booking.startsAt.getTime() &&
      booking.extras.length < MAX_EXTRA_SERVICES;
    const canRemoveServices = canCancel && booking.extras.length > 0;

    const services = [
      {
        id: booking.service.id,
        name: booking.service.name,
        durationMinutes: booking.service.durationMinutes,
        extraId: null,
      },
      ...booking.extras.map((extra) => ({
        id: extra.serviceId,
        name: extra.name,
        durationMinutes: extra.durationMinutes,
        extraId: extra.id,
      })),
    ];

    return {
      id: booking.id,
      status,
      cancelledBy: booking.cancelledBy,
      tenant: { slug: tenant.slug, name: tenant.name, timezone: tenant.timezone },
      customerName: booking.customerName,
      notes: booking.notes,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      totalMinutes: services.reduce((sum, s) => sum + s.durationMinutes, 0),
      services,
      cancelNoticeHours: tenant.cancelNoticeHours,
      cancelDeadline: deadline.toISOString(),
      canCancel,
      canAddServices,
      canRemoveServices,
      addable: canAddServices ? await this.addableServices(booking) : [],
    };
  }

  private async addableServices(booking: ManagedRow): Promise<AddableService[]> {
    const tenant = booking.tenant;
    const included = new Set([booking.serviceId, ...booking.extras.map((e) => e.serviceId)]);
    const candidates = tenant.bookingServices.filter((s) => s.active && !included.has(s.id));
    if (candidates.length === 0) return [];

    const longest = Math.max(...candidates.map((s) => s.durationMinutes));
    const horizon = new Date(booking.endsAt.getTime() + longest * 60_000);
    const following = await this.prisma.booking.findMany({
      where: {
        tenantId: tenant.id,
        status: 'CONFIRMED',
        id: { not: booking.id },
        startsAt: { gte: booking.endsAt, lt: horizon },
      },
      select: { startsAt: true },
    });

    const startMinute = localMinuteOfDay(booking.startsAt, tenant.timezone);
    const weekday = weekdayInZone(booking.startsAt, tenant.timezone);
    const window = tenant.availability.find(
      (rule) =>
        rule.weekday === weekday && rule.startMinute <= startMinute && startMinute < rule.endMinute,
    );
    const usedMinutes = Math.round(
      (booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000,
    );

    return candidates.map((service) => {
      const newEnd = new Date(booking.endsAt.getTime() + service.durationMinutes * 60_000);
      const insideWindow =
        window !== undefined &&
        startMinute + usedMinutes + service.durationMinutes <= window.endMinute;
      const free = !following.some((other) => other.startsAt < newEnd);
      return {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        available: insideWindow && free,
      };
    });
  }

  private async findByToken(token: string): Promise<ManagedRow> {
    const booking = await this.prisma.booking.findUnique({
      where: { manageTokenHash: hashToken(token) },
      include: managedInclude,
    });
    if (!booking || booking.tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Reserva não encontrada');
    }
    return booking;
  }

  private async throttle(ip: string, kind: 'read' | 'write') {
    const allowed =
      kind === 'read'
        ? await this.rateLimit.allow(`manage:r:${ip}`, MANAGE_READS_PER_10_MIN, 600)
        : await this.rateLimit.allow(`manage:w:${ip}`, MANAGE_WRITES_PER_10_MIN, 600);
    if (!allowed) throw new HttpException('Muitas tentativas', HttpStatus.TOO_MANY_REQUESTS);
  }

  private async notifyChange(booking: ManagedRow, change: string) {
    const details = this.mailDetails(
      booking.tenant.name,
      booking.tenant.timezone,
      booking,
      undefined,
    );
    await this.safeSend(() =>
      this.mail.sendBookingChanged(booking.customerEmail, details, change, 'customer'),
    );
    await this.safeSend(() =>
      this.mail.sendBookingChanged(booking.tenant.owner.email, details, change, 'owner'),
    );
  }

  private noticeLabel(hours: number) {
    if (hours === 0) return 'até o horário marcado';
    return hours === 1 ? 'até 1 hora antes' : `até ${hours} horas antes`;
  }

  private manageUrl(slug: string, token: string) {
    return `${this.webUrl}/s/${slug}/agenda/reserva/${token}`;
  }

  private serviceLines(booking: {
    service: { name: string; durationMinutes: number };
    extras: { name: string; durationMinutes: number }[];
  }): ServiceLine[] {
    return [
      { name: booking.service.name, durationMinutes: booking.service.durationMinutes },
      ...booking.extras.map((e) => ({ name: e.name, durationMinutes: e.durationMinutes })),
    ];
  }

  private findActiveService(tenant: BookableTenant, serviceId: string) {
    const service = tenant.bookingServices.find((s) => s.id === serviceId && s.active);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    return service;
  }

  private async bookableTenant(slug: string): Promise<BookableTenant> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: 'ACTIVE', bookingEnabled: true },
      include: {
        owner: {
          select: { email: true, subscription: { select: { plan: true, status: true } } },
        },
        availability: true,
        bookingServices: { where: { active: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!tenant || !entitlementsFor(resolvePlan(tenant.owner.subscription)).booking) {
      throw new NotFoundException('Agenda não encontrada');
    }
    return tenant;
  }

  private async ownerTenant(ownerId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
    if (!tenant) throw new NotFoundException('Você ainda não criou uma página');
    return tenant;
  }

  private mailDetails(
    tenantName: string,
    timezone: string,
    booking: {
      startsAt: Date;
      customerName: string;
      customerEmail: string;
      notes: string | null;
      service: { name: string; durationMinutes: number };
      extras: { name: string; durationMinutes: number }[];
    },
    manageUrl?: string,
  ): BookingMailDetails {
    const services = this.serviceLines(booking);
    return {
      tenantName,
      serviceName: services.map((s) => s.name).join(' + '),
      services,
      totalMinutes: services.reduce((sum, s) => sum + s.durationMinutes, 0),
      when: formatInZone(booking.startsAt, timezone),
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      notes: booking.notes,
      manageUrl,
    };
  }

  private async safeSend(send: () => Promise<void>) {
    try {
      await send();
    } catch (error) {
      this.logger.error(
        'Falha ao enviar e-mail da agenda',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
