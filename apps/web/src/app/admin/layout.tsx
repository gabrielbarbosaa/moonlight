import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
