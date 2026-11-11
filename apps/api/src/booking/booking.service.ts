import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { entitlementsFor, resolvePlan } from '@sitebuilder/schemas';
import type {
  BookingConfirmation,
  BookingSettings,
  BookingSettingsInput,
  BookingSlot,
  BookingsListQuery,
  CreateBookingInput,
  OwnerBooking,
  PublicBookingInfo,
  SlotsQuery,
} from '@sitebuilder/schemas';
import { EntitlementsService } from '../billing/entitlements.service';
import { MailPort, type BookingMailDetails } from '../mail/mail.port';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../redis/rate-limit.service';
import {
  addDays,
  formatInZone,
  isRealDate,
  localDate,
  weekdayOf,
  zonedTimeToUtc,
} from './booking.time';

const MIN_NOTICE_HOURS = 2;
const MAX_DAYS_AHEAD = 60;
const BOOK_LIMIT_PER_HOUR = 10;
const PAST_BOOKINGS_LIMIT = 50;

type BookableTenant = Prisma.TenantGetPayload<{
  include: {
    owner: { select: { email: true; subscription: { select: { plan: true; status: true } } } };
    availability: true;
    bookingServices: true;
  };
}>;

function isOverlapViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('bookings_no_overlap') || message.includes('23P01');
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailPort,
    private readonly rateLimit: RateLimitService,
    private readonly entitlements: EntitlementsService,
  ) {}

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
        data: { bookingEnabled: input.enabled, timezone: input.timezone },
      });
    });

    return this.getSettings(ownerId);
  }

  async listBookings(ownerId: string, query: BookingsListQuery): Promise<OwnerBooking[]> {
    const tenant = await this.ownerTenant(ownerId);
    const now = new Date();
    const upcoming = query.scope === 'upcoming';

    const rows = await this.prisma.booking.findMany({
      where: { tenantId: tenant.id, endsAt: upcoming ? { gte: now } : { lt: now } },
      orderBy: { startsAt: upcoming ? 'asc' : 'desc' },
      take: upcoming ? undefined : PAST_BOOKINGS_LIMIT,
      include: { service: { select: { name: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      serviceName: row.service.name,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      notes: row.notes,
      status: row.status,
    }));
  }

  async cancelBooking(ownerId: string, bookingId: string) {
    const tenant = await this.ownerTenant(ownerId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenant.id },
      include: { service: { select: { name: true } } },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada');
    if (booking.status === 'CANCELLED') return;

    await this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });

    await this.safeSend(() =>
      this.mail.sendBookingCancellation(
        booking.customerEmail,
        this.mailDetails(tenant.name, tenant.timezone, booking.service.name, booking),
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
    };
  }

  async getSlots(slug: string, query: SlotsQuery): Promise<BookingSlot[]> {
    if (!isRealDate(query.from)) throw new BadRequestException('Data inválida');
    const tenant = await this.bookableTenant(slug);
    const service = this.findActiveService(tenant, query.serviceId);
    return this.computeSlots(tenant, service.durationMinutes, query.from, query.days, new Date());
  }

  async book(slug: string, input: CreateBookingInput, ip: string): Promise<BookingConfirmation> {
    const allowed = await this.rateLimit.allow(`book:${ip}`, BOOK_LIMIT_PER_HOUR, 3600);
    if (!allowed) throw new HttpException('Muitas reservas', HttpStatus.TOO_MANY_REQUESTS);

    const tenant = await this.bookableTenant(slug);
    const service = this.findActiveService(tenant, input.serviceId);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

    const date = localDate(startsAt, tenant.timezone);
    const slots = await this.computeSlots(tenant, service.durationMinutes, date, 1, new Date());
    if (!slots.some((slot) => slot.startsAt === startsAt.toISOString())) {
      throw new ConflictException('Horário indisponível');
    }

    let booking;
    try {
      booking = await this.prisma.booking.create({
        data: {
          tenantId: tenant.id,
          serviceId: service.id,
          startsAt,
          endsAt,
          customerName: input.name,
          customerEmail: input.email,
          notes: input.notes || null,
        },
      });
    } catch (error) {
      if (isOverlapViolation(error)) throw new ConflictException('Horário indisponível');
      throw error;
    }

    const details = this.mailDetails(tenant.name, tenant.timezone, service.name, booking);
    await this.safeSend(() => this.mail.sendBookingConfirmation(booking.customerEmail, details));
    await this.safeSend(() => this.mail.sendBookingNotification(tenant.owner.email, details));

    return {
      id: booking.id,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      serviceName: service.name,
    };
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
    serviceName: string,
    booking: { startsAt: Date; customerName: string; customerEmail: string; notes: string | null },
  ): BookingMailDetails {
    return {
      tenantName,
      serviceName,
      when: formatInZone(booking.startsAt, timezone),
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      notes: booking.notes,
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
