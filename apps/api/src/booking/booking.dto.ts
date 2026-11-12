import {
  addServiceSchema,
  bookingSettingsSchema,
  bookingsListQuerySchema,
  createBookingSchema,
  idParamSchema,
  lookupBookingSchema,
  manageExtraParamSchema,
  manageTokenParamSchema,
  slotsQuerySchema,
} from '@moonlight/schemas';
import { createZodDto } from 'nestjs-zod';

export class BookingSettingsDto extends createZodDto(bookingSettingsSchema) {}
export class SlotsQueryDto extends createZodDto(slotsQuerySchema) {}
export class CreateBookingDto extends createZodDto(createBookingSchema) {}
export class BookingsListQueryDto extends createZodDto(bookingsListQuerySchema) {}
export class BookingIdParamDto extends createZodDto(idParamSchema) {}
export class ManageTokenParamDto extends createZodDto(manageTokenParamSchema) {}
export class ManageExtraParamDto extends createZodDto(manageExtraParamSchema) {}
export class AddServiceDto extends createZodDto(addServiceSchema) {}
export class LookupBookingDto extends createZodDto(lookupBookingSchema) {}
