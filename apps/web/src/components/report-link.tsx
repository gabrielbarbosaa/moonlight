'use client';

import { usePathname } from 'next/navigation';

export function ReportLink({ slug }: { slug: string }) {
  const pathname = usePathname();
  const href = pathname.startsWith(`/s/${slug}`) ? `/s/${slug}/report` : '/report';

  return (
    <p
      style={{ textAlign: 'center', fontSize: 12, margin: 0, padding: '8px 0 16px', opacity: 0.7 }}
    >
      <a href={href} style={{ color: 'inherit' }}>
        Denunciar esta página
      </a>
    </p>
  );
}
