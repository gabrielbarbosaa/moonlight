'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { Brand } from './brand';
import { Icon, type IconName } from './icons';
import { ThemeToggle } from './theme-toggle';

type NavItem = { href: string; label: string; icon: IconName };

const NAV: NavItem[] = [
  { href: '/admin', label: 'Painel', icon: 'layout' },
  { href: '/admin/editor', label: 'Editor', icon: 'pencil' },
  { href: '/admin/agenda', label: 'Agenda', icon: 'calendar' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/admin/billing', label: 'Plano', icon: 'card' },
];

const SUPERADMIN_NAV: NavItem = { href: '/admin/backoffice', label: 'Backoffice', icon: 'shield' };

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthPage = pathname === '/admin/login';

  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me, enabled: !isAuthPage });
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      router.replace('/admin/login');
    },
  });

  const items = me.data?.role === 'SUPERADMIN' ? [...NAV, SUPERADMIN_NAV] : NAV;

  return (
    <>
      <header className="shell-header">
        <div className="shell-inner">
          <Brand href={me.data ? '/admin' : '/'} />
          {!me.data && (
            <div style={{ marginLeft: 'auto' }}>
              <ThemeToggle />
            </div>
          )}
          {me.data && (
            <>
              <nav className="shell-nav" aria-label="Principal">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shell-link"
                    aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="shell-user">
                <ThemeToggle />
                <span className="shell-email">{me.data.email}</span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  <Icon name="logout" />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      {children}
    </>
  );
}
