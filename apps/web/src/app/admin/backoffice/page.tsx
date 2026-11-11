'use client';

import { REPORT_REASON_LABELS, type BackofficeTenant } from '@moonlight/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { authApi, backofficeApi, getErrorMessage } from '@/lib/api';

const cellStyle = {
  padding: '12px 14px',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  verticalAlign: 'top',
} as const;

type Tab = 'reports' | 'tenants' | 'audit';

const TAB_LABELS: Record<Tab, string> = {
  reports: 'Denúncias',
  tenants: 'Páginas',
  audit: 'Auditoria',
};

function reasonLabel(reason: string) {
  return REPORT_REASON_LABELS[reason as keyof typeof REPORT_REASON_LABELS] ?? reason;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value.toLocaleString('pt-BR')}</div>
    </div>
  );
}

function SuspendForm({
  onSubmit,
  onCancel,
  pending,
  initialReason = '',
}: {
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  pending: boolean;
  initialReason?: string;
}) {
  const [reason, setReason] = useState(initialReason);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length >= 3) onSubmit(reason.trim());
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <input
        aria-label="Motivo da suspensão"
        placeholder="Motivo da suspensão"
        value={reason}
        maxLength={200}
        onChange={(event) => setReason(event.target.value)}
        style={{ flex: 1, minWidth: 180 }}
      />
      <button type="submit" disabled={pending || reason.trim().length < 3}>
        Confirmar suspensão
      </button>
      <button type="button" onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}

function ReportsTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED'>('OPEN');
  const [suspending, setSuspending] = useState<string | null>(null);
  const reports = useQuery({
    queryKey: ['backoffice', 'reports', status],
    queryFn: () => backofficeApi.reports({ status }),
  });

  const resolve = useMutation({
    mutationFn: (input: { id: string; action: 'dismiss' | 'suspend'; note?: string }) =>
      backofficeApi.resolveReport(input.id, { action: input.action, note: input.note }),
    onSuccess: () => {
      setSuspending(null);
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    },
  });

  return (
    <section>
      <div className="segmented" role="group" aria-label="Status" style={{ marginBottom: 14 }}>
        {(['OPEN', 'RESOLVED', 'DISMISSED'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === status}
            onClick={() => setStatus(value)}
          >
            {value === 'OPEN' ? 'Abertas' : value === 'RESOLVED' ? 'Resolvidas' : 'Dispensadas'}
          </button>
        ))}
      </div>
      {resolve.isError && <p role="alert">{getErrorMessage(resolve.error)}</p>}
      {reports.isPending && <p>Carregando...</p>}
      {reports.isError && <p role="alert">{getErrorMessage(reports.error)}</p>}
      {reports.data && reports.data.items.length === 0 && (
        <div className="empty">Nenhuma denúncia nesta lista.</div>
      )}
      {reports.data && reports.data.items.length > 0 && (
        <table>
          <thead>
            <tr>
              <th style={cellStyle}>Página</th>
              <th style={cellStyle}>Motivo</th>
              <th style={cellStyle}>Data</th>
              <th style={cellStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {reports.data.items.map((report) => (
              <tr key={report.id}>
                <td style={cellStyle}>
                  <a href={`/s/${report.tenant.slug}`} target="_blank" rel="noreferrer">
                    {report.tenant.slug}
                  </a>{' '}
                  {report.tenant.status === 'SUSPENDED' && <em>(suspensa)</em>}
                </td>
                <td style={cellStyle}>
                  {reasonLabel(report.reason)}
                  {report.details && (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{report.details}</div>
                  )}
                </td>
                <td style={cellStyle}>{formatDate(report.createdAt)}</td>
                <td style={cellStyle}>
                  {report.status !== 'OPEN' ? (
                    '—'
                  ) : suspending === report.id ? (
                    <SuspendForm
                      pending={resolve.isPending}
                      initialReason={`Denúncia: ${reasonLabel(report.reason)}`}
                      onCancel={() => setSuspending(null)}
                      onSubmit={(note) =>
                        resolve.mutate({ id: report.id, action: 'suspend', note })
                      }
                    />
                  ) : (
                    <>
                      <button type="button" onClick={() => setSuspending(report.id)}>
                        Suspender página
                      </button>{' '}
                      <button
                        type="button"
                        disabled={resolve.isPending}
                        onClick={() => resolve.mutate({ id: report.id, action: 'dismiss' })}
                      >
                        Dispensar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TenantsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'SUSPENDED'>('');
  const [page, setPage] = useState(1);
  const [suspending, setSuspending] = useState<string | null>(null);

  const tenants = useQuery({
    queryKey: ['backoffice', 'tenants', applied, statusFilter, page],
    queryFn: () =>
      backofficeApi.tenants({
        search: applied || undefined,
        status: statusFilter || undefined,
        page,
      }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['backoffice'] });
  const suspend = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      backofficeApi.suspend(input.id, input.reason),
    onSuccess: () => {
      setSuspending(null);
      refresh();
    },
  });
  const reactivate = useMutation({ mutationFn: backofficeApi.reactivate, onSuccess: refresh });

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied(search.trim());
  };

  const totalPages = tenants.data
    ? Math.max(1, Math.ceil(tenants.data.total / tenants.data.pageSize))
    : 1;
  const actionError = suspend.error ?? reactivate.error;

  const renderActions = (tenant: BackofficeTenant) => {
    if (tenant.status === 'SUSPENDED') {
      return (
        <button
          type="button"
          disabled={reactivate.isPending}
          onClick={() => reactivate.mutate(tenant.id)}
        >
          Reativar
        </button>
      );
    }
    if (suspending === tenant.id) {
      return (
        <SuspendForm
          pending={suspend.isPending}
          onCancel={() => setSuspending(null)}
          onSubmit={(reason) => suspend.mutate({ id: tenant.id, reason })}
        />
      );
    }
    return (
      <button type="button" onClick={() => setSuspending(tenant.id)}>
        Suspender
      </button>
    );
  };

  return (
    <section>
      <form
        onSubmit={onSearch}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}
      >
        <input
          aria-label="Buscar"
          placeholder="Buscar por endereço, nome ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ flex: 1, minWidth: 220, padding: 4 }}
        />
        <select
          aria-label="Filtrar por status"
          value={statusFilter}
          onChange={(event) => {
            setPage(1);
            setStatusFilter(event.target.value as '' | 'ACTIVE' | 'SUSPENDED');
          }}
        >
          <option value="">Todas</option>
          <option value="ACTIVE">Ativas</option>
          <option value="SUSPENDED">Suspensas</option>
        </select>
        <button type="submit">Buscar</button>
      </form>

      {actionError && <p role="alert">{getErrorMessage(actionError)}</p>}
      {tenants.isPending && <p>Carregando...</p>}
      {tenants.isError && <p role="alert">{getErrorMessage(tenants.error)}</p>}
      {tenants.data && tenants.data.items.length === 0 && (
        <div className="empty">Nenhuma página encontrada.</div>
      )}
      {tenants.data && tenants.data.items.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th style={cellStyle}>Página</th>
                <th style={cellStyle}>Dono</th>
                <th style={cellStyle}>Status</th>
                <th style={cellStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.data.items.map((tenant) => (
                <tr key={tenant.id}>
                  <td style={cellStyle}>
                    <strong>{tenant.name}</strong>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{tenant.slug}</div>
                  </td>
                  <td style={cellStyle}>{tenant.ownerEmail}</td>
                  <td style={cellStyle}>
                    {tenant.status === 'SUSPENDED'
                      ? `Suspensa: ${tenant.suspendedReason ?? ''}`
                      : 'Ativa'}
                    {tenant.openReports > 0 && (
                      <div style={{ fontSize: 13 }}>{tenant.openReports} denúncia(s) aberta(s)</div>
                    )}
                  </td>
                  <td style={cellStyle}>{renderActions(tenant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </button>{' '}
            Página {page} de {totalPages}{' '}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Próxima
            </button>
          </p>
        </>
      )}
    </section>
  );
}

function AuditTab() {
  const audit = useQuery({ queryKey: ['backoffice', 'audit'], queryFn: backofficeApi.audit });

  if (audit.isPending) return <p>Carregando...</p>;
  if (audit.isError) return <p role="alert">{getErrorMessage(audit.error)}</p>;
  if (audit.data.length === 0) return <div className="empty">Nenhuma ação registrada.</div>;

  return (
    <table>
      <thead>
        <tr>
          <th style={cellStyle}>Quando</th>
          <th style={cellStyle}>Quem</th>
          <th style={cellStyle}>Ação</th>
          <th style={cellStyle}>Detalhes</th>
        </tr>
      </thead>
      <tbody>
        {audit.data.map((entry) => (
          <tr key={entry.id}>
            <td style={cellStyle}>{formatDate(entry.createdAt)}</td>
            <td style={cellStyle}>{entry.actorEmail ?? '—'}</td>
            <td style={cellStyle}>{entry.action}</td>
            <td style={cellStyle}>
              {entry.targetType} {entry.targetId.slice(0, 8)}
              {typeof entry.metadata.reason === 'string' && (
                <div>Motivo: {entry.metadata.reason}</div>
              )}
              {typeof entry.metadata.note === 'string' && <div>Nota: {entry.metadata.note}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function BackofficePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('reports');
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const isSuperadmin = me.data?.role === 'SUPERADMIN';
  const stats = useQuery({
    queryKey: ['backoffice', 'stats'],
    queryFn: backofficeApi.stats,
    enabled: isSuperadmin,
  });

  const status = isAxiosError(me.error) ? me.error.response?.status : undefined;
  const forbidden = me.isSuccess && !isSuperadmin;

  useEffect(() => {
    if (status === 401) router.replace('/admin/login');
    if (forbidden) router.replace('/admin');
  }, [status, forbidden, router]);

  if (me.isPending || status === 401 || forbidden) {
    return (
      <main className="page">
        <p>Carregando...</p>
      </main>
    );
  }

  if (me.isError) {
    return (
      <main className="page">
        <p role="alert">Não foi possível carregar o backoffice.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Backoffice</h1>
          <p>Moderação, denúncias e auditoria da plataforma.</p>
        </div>
        <div className="segmented" role="group" aria-label="Seção">
          {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
            <button key={key} type="button" aria-pressed={key === tab} onClick={() => setTab(key)}>
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {stats.data && (
        <div className="row" style={{ alignItems: 'stretch', gap: 12, marginBottom: 24 }}>
          <Stat label="Usuários" value={stats.data.users} />
          <Stat label="Páginas" value={stats.data.tenants} />
          <Stat label="Suspensas" value={stats.data.suspendedTenants} />
          <Stat label="Denúncias abertas" value={stats.data.openReports} />
        </div>
      )}

      {tab === 'reports' && <ReportsTab />}
      {tab === 'tenants' && <TenantsTab />}
      {tab === 'audit' && <AuditTab />}
    </main>
  );
}
