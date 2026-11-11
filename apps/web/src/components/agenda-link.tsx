'use client';

import { usePathname } from 'next/navigation';

export function AgendaLink({ slug }: { slug: string }) {
  const pathname = usePathname();
  const href = pathname.startsWith(`/s/${slug}`) ? `/s/${slug}/agenda` : '/agenda';

  return (
    <p style={{ textAlign: 'center', margin: 0, padding: '16px 0 0' }}>
      <a
        href={href}
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          borderRadius: 8,
          background: '#4f46e5',
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Agendar horário
      </a>
    </p>
  );
}
