export type BookingMailDetails = {
  tenantName: string;
  serviceName: string;
  services: { name: string; durationMinutes: number }[];
  totalMinutes: number;
  when: string;
  customerName: string;
  customerEmail: string;
  notes?: string | null;
  manageUrl?: string;
};

export type BookingLinkItem = { when: string; serviceName: string; url: string };

export abstract class MailPort {
  abstract sendAuthCode(to: string, code: string, expiresInMinutes: number): Promise<void>;
  abstract sendBookingConfirmation(to: string, details: BookingMailDetails): Promise<void>;
  abstract sendBookingNotification(to: string, details: BookingMailDetails): Promise<void>;
  abstract sendBookingCancellation(to: string, details: BookingMailDetails): Promise<void>;
  abstract sendBookingCancelledByCustomer(to: string, details: BookingMailDetails): Promise<void>;
  abstract sendBookingChanged(
    to: string,
    details: BookingMailDetails,
    change: string,
    audience: 'customer' | 'owner',
  ): Promise<void>;
  abstract sendBookingLinks(
    to: string,
    tenantName: string,
    items: BookingLinkItem[],
  ): Promise<void>;
}
