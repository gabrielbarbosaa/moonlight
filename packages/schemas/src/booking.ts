import { z } from 'zod';
import { emailSchema } from './auth';

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Fuso horário inválido' },
  );

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

export const bookingServiceInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Informe o nome').max(60),
  durationMinutes: z.number().int().min(15).max(480).multipleOf(5),
});

export const availabilityRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((rule) => rule.endMinute > rule.startMinute, {
    message: 'O fim deve ser depois do início',
    path: ['endMinute'],
  });

export const CANCEL_NOTICE_OPTIONS = [0, 1, 2, 4, 12, 24, 48] as const;
export const MAX_EXTRA_SERVICES = 3;

export const bookingSettingsSchema = z
  .object({
    enabled: z.boolean(),
    timezone: timezoneSchema,
    cancelNoticeHours: z.number().int().min(0).max(168).default(2),
    services: z.array(bookingServiceInputSchema).max(10),
    rules: z.array(availabilityRuleSchema).max(28),
  })
  .refine(
    (settings) => {
      const byDay = new Map<number, { start: number; end: number }[]>();
      for (const rule of settings.rules) {
        const windows = byDay.get(rule.weekday) ?? [];
        if (windows.some((w) => rule.startMinute < w.end && rule.endMinute > w.start)) return false;
        windows.push({ start: rule.startMinute, end: rule.endMinute });
        byDay.set(rule.weekday, windows);
      }
      return true;
    },
    { message: 'Há janelas de horário sobrepostas no mesmo dia', path: ['rules'] },
  )
  .refine((settings) => !settings.enabled || settings.services.length > 0, {
    message: 'Cadastre ao menos um serviço para ativar a agenda',
    path: ['services'],
  })
  .refine((settings) => !settings.enabled || settings.rules.length > 0, {
    message: 'Defina ao menos uma janela de horário para ativar a agenda',
    path: ['rules'],
  });
export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

export const slotsQuerySchema = z.object({
  serviceId: z.string().uuid(),
  extraIds: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter(Boolean) : []))
    .pipe(z.array(z.string().uuid()).max(MAX_EXTRA_SERVICES)),
  from: dateStringSchema,
  days: z.coerce.number().int().min(1).max(14).default(7),
});
export type SlotsQuery = z.infer<typeof slotsQuerySchema>;

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  extraServiceIds: z.array(z.string().uuid()).max(MAX_EXTRA_SERVICES).default([]),
  startsAt: z.string().datetime(),
  name: z.string().trim().min(1, 'Informe seu nome').max(80),
  email: emailSchema,
  notes: z.string().trim().max(300).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const manageTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const manageTokenParamSchema = z.object({ token: manageTokenSchema });
export const manageExtraParamSchema = z.object({
  token: manageTokenSchema,
  extraId: z.string().uuid(),
});
export const addServiceSchema = z.object({ serviceId: z.string().uuid() });
export type AddServiceInput = z.infer<typeof addServiceSchema>;
export const lookupBookingSchema = z.object({ email: emailSchema });
export type LookupBookingInput = z.infer<typeof lookupBookingSchema>;

export const BOOKINGS_PAGE_SIZES = [10, 25, 50] as const;

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

export const bookingsListQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  status: z.enum(['all', 'CONFIRMED', 'CANCELLED']).default('all'),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  serviceId: z.string().uuid().optional().catch(undefined),
  from: optionalDate,
  to: optionalDate,
  page: z.coerce.number().int().min(1).max(10000).catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => (BOOKINGS_PAGE_SIZES as readonly number[]).includes(n))
    .catch(10)
    .default(10),
});
export type BookingsListQuery = z.infer<typeof bookingsListQuerySchema>;

export type OwnerBookingsPage = {
  items: OwnerBooking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const idParamSchema = z.object({ id: z.string().uuid() });

export type BookingServiceDto = { id: string; name: string; durationMinutes: number };

export type BookingSettings = {
  enabled: boolean;
  timezone: string;
  cancelNoticeHours: number;
  services: BookingServiceDto[];
  rules: { weekday: number; startMinute: number; endMinute: number }[];
};

export type PublicBookingInfo = {
  slug: string;
  name: string;
  timezone: string;
  services: BookingServiceDto[];
  maxDaysAhead: number;
  cancelNoticeHours: number;
};

export type BookingSlot = { startsAt: string; endsAt: string };

export type OwnerBooking = {
  id: string;
  serviceName: string;
  services: { name: string; durationMinutes: number }[];
  totalMinutes: number;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerEmail: string;
  notes: string | null;
  status: 'CONFIRMED' | 'CANCELLED';
  cancelledBy: 'CUSTOMER' | 'OWNER' | null;
};

export type BookingConfirmation = {
  id: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  services: { name: string; durationMinutes: number }[];
  totalMinutes: number;
  manageToken: string;
};

export type ManagedBookingService = {
  id: string;
  name: string;
  durationMinutes: number;
  extraId: string | null;
};

export type AddableService = {
  id: string;
  name: string;
  durationMinutes: number;
  available: boolean;
};

export type ManagedBooking = {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  cancelledBy: 'CUSTOMER' | 'OWNER' | null;
  tenant: { slug: string; name: string; timezone: string };
  customerName: string;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  totalMinutes: number;
  services: ManagedBookingService[];
  cancelNoticeHours: number;
  cancelDeadline: string;
  canCancel: boolean;
  canAddServices: boolean;
  canRemoveServices: boolean;
  addable: AddableService[];
};
