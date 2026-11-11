import {
  bookingSettingsSchema,
  bookingsListQuerySchema,
  createBookingSchema,
  idParamSchema,
  slotsQuerySchema,
} from '@moonlight/schemas';
import { createZodDto } from 'nestjs-zod';

export class BookingSettingsDto extends createZodDto(bookingSettingsSchema) {}
export class SlotsQueryDto extends createZodDto(slotsQuerySchema) {}
export class CreateBookingDto extends createZodDto(createBookingSchema) {}
export class BookingsListQueryDto extends createZodDto(bookingsListQuerySchema) {}
export class BookingIdParamDto extends createZodDto(idParamSchema) {}
