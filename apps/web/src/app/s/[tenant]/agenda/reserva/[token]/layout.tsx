import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Minha reserva',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ManageBookingLayout({ children }: { children: ReactNode }) {
  return children;
}
