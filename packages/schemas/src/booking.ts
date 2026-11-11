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

export const bookingSettingsSchema = z
  .object({
    enabled: z.boolean(),
    timezone: timezoneSchema,
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
  from: dateStringSchema,
  days: z.coerce.number().int().min(1).max(14).default(7),
});
export type SlotsQuery = z.infer<typeof slotsQuerySchema>;

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  name: z.string().trim().min(1, 'Informe seu nome').max(80),
  email: emailSchema,
  notes: z.string().trim().max(300).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingsListQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past']).default('upcoming'),
});
export type BookingsListQuery = z.infer<typeof bookingsListQuerySchema>;

export const idParamSchema = z.object({ id: z.string().uuid() });

export type BookingServiceDto = { id: string; name: string; durationMinutes: number };

export type BookingSettings = {
  enabled: boolean;
  timezone: string;
  services: BookingServiceDto[];
  rules: { weekday: number; startMinute: number; endMinute: number }[];
};

export type PublicBookingInfo = {
  slug: string;
  name: string;
  timezone: string;
  services: BookingServiceDto[];
  maxDaysAhead: number;
};

export type BookingSlot = { startsAt: string; endsAt: string };

export type OwnerBooking = {
  id: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerEmail: string;
  notes: string | null;
  status: 'CONFIRMED' | 'CANCELLED';
};

export type BookingConfirmation = {
  id: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
};
