'use client';

import { usePathname } from 'next/navigation';

export function useTenantBase(slug: string): string {
  const pathname = usePathname();
  return pathname.startsWith(`/s/${slug}`) ? `/s/${slug}` : '';
}
