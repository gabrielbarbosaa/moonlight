'use client';

import { usePathname } from 'next/navigation';

export function AgendaLink({ slug }: { slug: string }) {
  const pathname = usePathname();
  const href = pathname.startsWith(`/s/${slug}`) ? `/s/${slug}/agenda` : '/agenda';

  return (
    <p className="sbp-agenda">
      <a className="sbp-btn" href={href}>
        Agendar horário
      </a>
    </p>
  );
}
