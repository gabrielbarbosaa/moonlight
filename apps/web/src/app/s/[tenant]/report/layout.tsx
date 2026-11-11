import type { ReactNode } from 'react';

export default function ReportLayout({ children }: { children: ReactNode }) {
  return <div className="app">{children}</div>;
}
