'use client';

import { usePathname } from 'next/navigation';

export function ReportLink({ slug }: { slug: string }) {
  const pathname = usePathname();
  const href = pathname.startsWith(`/s/${slug}`) ? `/s/${slug}/report` : '/report';

  return (
    <p className="sbp-report">
      <a href={href}>Denunciar esta página</a>
    </p>
  );
}
