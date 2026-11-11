import type { ReactNode } from 'react';

export default function AgendaLayout({ children }: { children: ReactNode }) {
  return <div className="app">{children}</div>;
}
