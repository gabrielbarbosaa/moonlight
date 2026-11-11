'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { analyticsApi, billingApi } from '@/lib/api';

const RANGES = [7, 30, 90];

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value.toLocaleString('pt-BR')}</div>
    </div>
  );
}

function formatDay(date: string) {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const billing = useQuery({ queryKey: ['billing'], queryFn: billingApi.me });
  const maxDays = billing.data?.entitlements.analyticsDays ?? 90;
  const effectiveDays = Math.min(days, maxDays);
  const query = useQuery({
    queryKey: ['analytics', effectiveDays],
    queryFn: () => analyticsApi.summary(effectiveDays),
  });

  const status = isAxiosError(query.error) ? query.error.response?.status : undefined;

  useEffect(() => {
    if (status === 401) router.replace('/admin/login');
    if (status === 404) router.replace('/admin');
  }, [status, router]);

  if (query.isPending || status === 401 || status === 404) {
    return (
      <main className="page">
        <p className="muted">Carregando...</p>
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="page page-narrow">
        <p role="alert">Não foi possível carregar os dados.</p>
        <button type="button" onClick={() => query.refetch()}>
          Tentar de novo
        </button>
      </main>
    );
  }

  const { totals, daily, topLinks, from, to } = query.data;
  const maxViews = Math.max(1, ...daily.map((day) => day.views));
  const hasData = totals.views > 0 || totals.clicks > 0;
  const topClicks = Math.max(1, ...topLinks.map((link) => link.clicks));

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>
            De {formatDay(from)} a {formatDay(to)} (horário UTC).
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Período">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={range === effectiveDays}
              disabled={range > maxDays}
              title={range > maxDays ? 'Disponível no plano Pro' : undefined}
              onClick={() => setDays(range)}
            >
              {range} dias
            </button>
          ))}
        </div>
      </div>

      {maxDays < 90 && (
        <p className="hint" style={{ marginTop: -12 }}>
          Períodos maiores estão no <Link href="/admin/billing">plano Pro</Link>.
        </p>
      )}

      <div className="row" style={{ alignItems: 'stretch', gap: 12, marginBottom: 20 }}>
        <Kpi label="Visitas" value={totals.views} />
        <Kpi label="Visitantes únicos (soma dos dias)" value={totals.uniqueVisitors} />
        <Kpi label="Cliques em links" value={totals.clicks} />
      </div>

      <h2 className="section-title">Visitas por dia</h2>
      <div className="card chart">
        <div className="chart-bars" role="img" aria-label="Gráfico de visitas por dia">
          {daily.map((day) => (
            <div
              key={day.date}
              className="chart-bar"
              data-empty={day.views === 0 ? 'true' : 'false'}
              title={`${formatDay(day.date)}: ${day.views} visitas`}
              style={{
                height: day.views === 0 ? '3px' : `${Math.max(4, (day.views / maxViews) * 100)}%`,
              }}
            />
          ))}
        </div>
        <div className="chart-axis">
          <span>{formatDay(from)}</span>
          {!hasData && <span>Ainda sem visitas neste período</span>}
          <span>{formatDay(to)}</span>
        </div>
      </div>

      <h2 className="section-title">Links mais clicados</h2>
      {topLinks.length === 0 ? (
        <div className="empty">Nenhum clique registrado no período.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {topLinks.map((link, index) => (
            <div
              key={link.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: index === 0 ? 0 : '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{link.label}</div>
                <div
                  style={{
                    height: 6,
                    marginTop: 6,
                    width: `${(link.clicks / topClicks) * 100}%`,
                    background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                    borderRadius: 999,
                  }}
                />
              </div>
              <strong>{link.clicks}</strong>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
