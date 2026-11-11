'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';

const mainStyle = { maxWidth: 760, margin: '48px auto', padding: '0 16px' } as const;
const RANGES = [7, 30, 90];

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '12px 16px',
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 13, color: '#555' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value.toLocaleString('pt-BR')}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ['analytics', days],
    queryFn: () => analyticsApi.summary(days),
  });

  const status = isAxiosError(query.error) ? query.error.response?.status : undefined;

  useEffect(() => {
    if (status === 401) router.replace('/admin/login');
    if (status === 404) router.replace('/admin');
  }, [status, router]);

  if (query.isPending || status === 401 || status === 404) {
    return (
      <main style={mainStyle}>
        <p>Carregando...</p>
      </main>
    );
  }

  if (query.isError) {
    return (
      <main style={mainStyle}>
        <p>Não foi possível carregar os dados.</p>
        <button type="button" onClick={() => query.refetch()}>
          Tentar de novo
        </button>
      </main>
    );
  }

  const { totals, daily, topLinks, from, to } = query.data;
  const maxViews = Math.max(1, ...daily.map((day) => day.views));

  return (
    <main style={mainStyle}>
      <p>
        <Link href="/admin">← Painel</Link>
      </p>
      <h1>Analytics</h1>

      <p>
        Período:{' '}
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setDays(range)}
            disabled={range === days}
            style={{ marginRight: 6 }}
          >
            {range} dias
          </button>
        ))}
        <span style={{ color: '#555', fontSize: 13 }}>
          {' '}
          ({from} a {to}, em UTC)
        </span>
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
        <Kpi label="Visitas" value={totals.views} />
        <Kpi label="Visitantes únicos (soma dos dias)" value={totals.uniqueVisitors} />
        <Kpi label="Cliques em links" value={totals.clicks} />
      </div>

      <h2 style={{ fontSize: 18 }}>Visitas por dia</h2>
      <div
        role="img"
        aria-label="Gráfico de visitas por dia"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 2,
          height: 120,
          borderBottom: '1px solid #ccc',
        }}
      >
        {daily.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.views} visitas`}
            style={{
              flex: 1,
              height: `${(day.views / maxViews) * 100}%`,
              minHeight: day.views > 0 ? 2 : 0,
              background: '#4f46e5',
            }}
          />
        ))}
      </div>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Links mais clicados</h2>
      {topLinks.length === 0 ? (
        <p>Nenhum clique registrado no período.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Link</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc' }}>Cliques</th>
            </tr>
          </thead>
          <tbody>
            {topLinks.map((link) => (
              <tr key={link.id}>
                <td style={{ padding: '6px 0' }}>{link.label}</td>
                <td style={{ textAlign: 'right' }}>{link.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
