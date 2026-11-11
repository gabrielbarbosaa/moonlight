import type { ReactNode } from 'react';

export default function BillingLayout({ children }: { children: ReactNode }) {
  return <div className="app">{children}</div>;
}
