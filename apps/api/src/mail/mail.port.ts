export type BookingMailDetails = {
  tenantName: string;
  serviceName: string;
  when: string;
  customerName: string;
  customerEmail: string;
  notes?: string | null;
};

export abstract class MailPort {
  abstract sendAuthCode(to: string, code: string, expiresInMinutes: number): Promise<void>;
  abstract sendBookingConfirmation(to: string, details: BookingMailDetails): Promise<void>;
  abstract sendBookingNotification(to: string, details: BookingMailDetails): Promise<void>;
  abstract sendBookingCancellation(to: string, details: BookingMailDetails): Promise<void>;
}
