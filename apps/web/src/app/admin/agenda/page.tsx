'use client';

import {
  BOOKINGS_PAGE_SIZES,
  CANCEL_NOTICE_OPTIONS,
  WEEKDAY_LABELS,
  bookingSettingsSchema,
  type BookingSettingsInput,
  type OwnerBooking,
} from '@moonlight/schemas';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { billingApi, bookingApi, getErrorMessage } from '@/lib/api';

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 180, 240];

function noticeOptions(current: number) {
  return [...new Set([...CANCEL_NOTICE_OPTIONS, current])].sort((a, b) => a - b);
}

function noticeLabel(hours: number) {
  if (hours === 0) return 'O horário marcado';
  return hours === 1 ? '1 hora antes' : `${hours} horas antes`;
}

function durationOptions(current: number) {
  return [...new Set([...DURATIONS, current])].sort((a, b) => a - b);
}
const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Cuiaba',
  'America/Rio_Branco',
  'America/New_York',
  'Europe/Lisbon',
  'UTC',
];

type Settings = BookingSettingsInput;

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function fromTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const queryClient = useQueryClient();
  const billing = useQuery({ queryKey: ['billing'], queryFn: billingApi.me });
  const entitled = billing.data ? billing.data.entitlements.booking : true;
  const [settings, setSettings] = useState<Settings>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: bookingApi.saveSettings,
    onSuccess: (data) => {
      setSettings(data);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['booking-settings'] });
    },
  });

  const edit = (next: Settings) => {
    setSaved(false);
    setSettings(next);
  };

  const submit = () => {
    const result = bookingSettingsSchema.safeParse(settings);
    if (!result.success) {
      setErrors(result.error.issues.map((issue) => issue.message));
      return;
    }
    setErrors([]);
    save.mutate(result.data);
  };

  const updateRule = (index: number, patch: Partial<Settings['rules'][number]>) =>
    edit({
      ...settings,
      rules: settings.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    });

  return (
    <>
      <div className="page-head" style={{ marginTop: 0 }}>
        <p className="muted" style={{ margin: 0 }}>
          Defina o que você atende e quando. Seus clientes reservam pela sua página.
        </p>
        <div className="row">
          {saved && <span role="status">Configuração salva</span>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </div>
      </div>

      {!entitled && (
        <p role="alert">
          A agenda de reservas faz parte do plano Pro. Sua agenda fica desativada para os visitantes
          até a assinatura. <Link href="/admin/billing">Ver planos</Link>
        </p>
      )}

      {errors.length > 0 && (
        <div role="alert">
          <ul style={{ margin: 0 }}>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {save.isError && <p role="alert">{getErrorMessage(save.error)}</p>}

      <div className="stack">
        <div className="card">
          <div className="two-cols" style={{ alignItems: 'end' }}>
            <label className="switch">
              <input
                type="checkbox"
                disabled={!entitled}
                checked={settings.enabled}
                onChange={(event) => edit({ ...settings, enabled: event.target.checked })}
              />
              Aceitar reservas na minha página
            </label>
            <label className="field" style={{ margin: 0 }}>
              Fuso horário
              <input
                list="timezones"
                value={settings.timezone}
                onChange={(event) => edit({ ...settings, timezone: event.target.value })}
              />
              <datalist id="timezones">
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="field" style={{ marginTop: 16, maxWidth: 360 }}>
            Cliente pode cancelar pelo link até
            <select
              value={settings.cancelNoticeHours}
              onChange={(event) =>
                edit({ ...settings, cancelNoticeHours: Number(event.target.value) })
              }
            >
              {noticeOptions(settings.cancelNoticeHours).map((hours) => (
                <option key={hours} value={hours}>
                  {noticeLabel(hours)}
                </option>
              ))}
            </select>
            <span className="hint" style={{ display: 'block' }}>
              Depois desse prazo o cliente precisa falar com você. Ele pode adicionar serviços até o
              início, se houver horário livre logo depois.
            </span>
          </label>
        </div>

        <div className="card">
          <h2>Serviços</h2>
          <p className="muted">
            Cada serviço tem uma duração. Os horários livres seguem essa duração.
          </p>
          {settings.services.map((service, index) => (
            <div key={service.id ?? `new-${index}`} className="service-row">
              <input
                aria-label="Nome do serviço"
                placeholder="Nome do serviço"
                value={service.name}
                maxLength={60}
                onChange={(event) =>
                  edit({
                    ...settings,
                    services: settings.services.map((s, i) =>
                      i === index ? { ...s, name: event.target.value } : s,
                    ),
                  })
                }
              />
              <select
                aria-label="Duração"
                value={service.durationMinutes}
                onChange={(event) =>
                  edit({
                    ...settings,
                    services: settings.services.map((s, i) =>
                      i === index ? { ...s, durationMinutes: Number(event.target.value) } : s,
                    ),
                  })
                }
              >
                {durationOptions(service.durationMinutes).map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-ghost"
                aria-label={`Remover serviço ${service.name}`}
                onClick={() =>
                  edit({ ...settings, services: settings.services.filter((_, i) => i !== index) })
                }
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={settings.services.length >= 10}
            onClick={() =>
              edit({
                ...settings,
                services: [...settings.services, { name: '', durationMinutes: 30 }],
              })
            }
          >
            <Icon name="plus" />
            Adicionar serviço
          </button>
        </div>

        <div className="card">
          <h2>Horários de atendimento</h2>
          <p className="muted">
            Janelas semanais no fuso escolhido. Dias sem janela ficam fechados.
          </p>
          {WEEKDAY_LABELS.map((label, weekday) => {
            const entries = settings.rules
              .map((rule, index) => ({ rule, index }))
              .filter((entry) => entry.rule.weekday === weekday);
            return (
              <div key={label} className="week-row">
                <strong>{label}</strong>
                <div className="week-windows">
                  {entries.length === 0 && <span className="week-off">Fechado</span>}
                  {entries.map(({ rule, index }) => (
                    <span key={index} className="window-chip">
                      <input
                        type="time"
                        aria-label={`${label} início`}
                        value={toTime(rule.startMinute)}
                        onChange={(event) =>
                          updateRule(index, { startMinute: fromTime(event.target.value) })
                        }
                      />
                      <span className="muted">às</span>
                      <input
                        type="time"
                        aria-label={`${label} fim`}
                        value={toTime(rule.endMinute)}
                        onChange={(event) =>
                          updateRule(index, { endMinute: fromTime(event.target.value) })
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover janela de ${label}`}
                        onClick={() =>
                          edit({ ...settings, rules: settings.rules.filter((_, i) => i !== index) })
                        }
                      >
                        <Icon name="x" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      edit({
                        ...settings,
                        rules: [...settings.rules, { weekday, startMinute: 540, endMinute: 1080 }],
                      })
                    }
                  >
                    <Icon name="plus" />
                    Janela
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

type Scope = 'upcoming' | 'past' | 'all';
type StatusFilter = 'all' | 'CONFIRMED' | 'CANCELLED';

type Filters = {
  scope: Scope;
  status: StatusFilter;
  q: string;
  serviceId: string;
  from: string;
  to: string;
  pageSize: number;
};

const INITIAL_FILTERS: Filters = {
  scope: 'upcoming',
  status: 'all',
  q: '',
  serviceId: '',
  from: '',
  to: '',
  pageSize: 10,
};

const SCOPE_LABEL: Record<Scope, string> = {
  upcoming: 'Próximas',
  past: 'Anteriores',
  all: 'Todas',
};

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

function statusBadge(booking: OwnerBooking) {
  if (booking.status === 'CONFIRMED') {
    return <span className="badge badge-success">Confirmada</span>;
  }
  return (
    <span className="badge badge-danger">
      {booking.cancelledBy === 'CUSTOMER' ? 'Cancelada pelo cliente' : 'Cancelada'}
    </span>
  );
}

function BookingsPanel({
  timezone,
  services,
}: {
  timezone: string;
  services: { id: string; name: string }[];
}) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState<string | null>(null);
  const debouncedSearch = useDebounced(filters.q.trim());

  const params = {
    scope: filters.scope,
    status: filters.status,
    q: debouncedSearch || undefined,
    serviceId: filters.serviceId || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page,
    pageSize: filters.pageSize,
  };

  const bookings = useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingApi.listBookings(params),
    placeholderData: keepPreviousData,
  });

  const cancel = useMutation({
    mutationFn: bookingApi.cancel,
    onSuccess: () => {
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const change = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    setConfirming(null);
  };

  const data = bookings.data;
  const dirty =
    JSON.stringify({ ...filters, pageSize: 0 }) !==
    JSON.stringify({ ...INITIAL_FILTERS, pageSize: 0 });
  const filtered =
    filters.status !== 'all' ||
    filters.q !== '' ||
    filters.serviceId !== '' ||
    filters.from !== '' ||
    filters.to !== '';
  const firstItem = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastItem = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <section className="stack">
      <div className="card bk-filters">
        <div className="bk-filters-top">
          <div className="segmented" role="group" aria-label="Período">
            {(Object.keys(SCOPE_LABEL) as Scope[]).map((scope) => (
              <button
                key={scope}
                type="button"
                aria-pressed={filters.scope === scope}
                onClick={() => change({ scope })}
              >
                {SCOPE_LABEL[scope]}
              </button>
            ))}
          </div>
          {dirty && (
            <button type="button" className="btn-ghost" onClick={() => change(INITIAL_FILTERS)}>
              <Icon name="x" />
              Limpar filtros
            </button>
          )}
        </div>
        <div className="bk-filters-grid">
          <label className="field">
            Buscar cliente
            <input
              type="search"
              placeholder="Nome ou e-mail"
              value={filters.q}
              maxLength={100}
              onChange={(event) => change({ q: event.target.value })}
            />
          </label>
          <label className="field">
            Status
            <select
              value={filters.status}
              onChange={(event) => change({ status: event.target.value as StatusFilter })}
            >
              <option value="all">Todos</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </label>
          <label className="field">
            Serviço
            <select
              value={filters.serviceId}
              onChange={(event) => change({ serviceId: event.target.value })}
            >
              <option value="">Todos</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            De
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => change({ from: event.target.value })}
            />
          </label>
          <label className="field">
            Até
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => change({ to: event.target.value })}
            />
          </label>
        </div>
      </div>

      {cancel.isError && <p role="alert">{getErrorMessage(cancel.error)}</p>}
      {bookings.isPending && <p className="muted">Carregando...</p>}
      {bookings.isError && <p role="alert">{getErrorMessage(bookings.error)}</p>}

      {data && data.total === 0 && (
        <div className="empty">
          {filtered
            ? 'Nenhuma reserva encontrada com esses filtros.'
            : filters.scope === 'upcoming'
              ? 'Nenhuma reserva futura por enquanto.'
              : 'Nenhuma reserva por aqui.'}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="card bk-table-card" aria-busy={bookings.isFetching}>
          <div className="table-wrap">
            <table className="bk-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Cliente</th>
                  <th>Serviços</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((booking) => {
                  const start = new Date(booking.startsAt);
                  const end = new Date(booking.endsAt);
                  const upcoming = end.getTime() >= Date.now();
                  return (
                    <tr key={booking.id} data-status={booking.status}>
                      <td>
                        <strong>
                          {start.toLocaleDateString('pt-BR', {
                            timeZone: timezone,
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </strong>
                        <div className="hint" style={{ margin: 0 }}>
                          {start.toLocaleTimeString('pt-BR', {
                            timeZone: timezone,
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' – '}
                          {end.toLocaleTimeString('pt-BR', {
                            timeZone: timezone,
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td>
                        {booking.customerName}
                        <div className="hint" style={{ margin: 0 }}>
                          {booking.customerEmail}
                        </div>
                        {booking.notes && <div className="bk-note">{booking.notes}</div>}
                      </td>
                      <td>
                        {booking.services.map((service) => service.name).join(' + ')}
                        <div className="hint" style={{ margin: 0 }}>
                          {booking.totalMinutes} min no total
                        </div>
                      </td>
                      <td>{statusBadge(booking)}</td>
                      <td className="bk-actions-cell">
                        {booking.status === 'CONFIRMED' &&
                          upcoming &&
                          (confirming === booking.id ? (
                            <span className="row" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn-danger"
                                disabled={cancel.isPending}
                                onClick={() => cancel.mutate(booking.id)}
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setConfirming(null)}
                              >
                                Voltar
                              </button>
                            </span>
                          ) : (
                            <button type="button" onClick={() => setConfirming(booking.id)}>
                              Cancelar
                            </button>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bk-pager">
            <span className="muted">
              {firstItem}–{lastItem} de {data.total} {data.total === 1 ? 'reserva' : 'reservas'}
            </span>
            <div className="row">
              <label className="bk-pagesize">
                Por página
                <select
                  value={filters.pageSize}
                  onChange={(event) => change({ pageSize: Number(event.target.value) })}
                >
                  {BOOKINGS_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                Anterior
              </button>
              <span className="bk-page-count">
                {data.page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(data.page + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AgendaAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'bookings' | 'settings'>('bookings');
  const settings = useQuery({
    queryKey: ['booking-settings'],
    queryFn: bookingApi.getSettings,
    staleTime: Infinity,
  });

  const status = isAxiosError(settings.error) ? settings.error.response?.status : undefined;

  useEffect(() => {
    if (status === 401) router.replace('/admin/login');
    if (status === 404) router.replace('/admin');
  }, [status, router]);

  if (settings.isPending || status === 401 || status === 404) {
    return (
      <main className="page">
        <p className="muted">Carregando...</p>
      </main>
    );
  }

  if (settings.isError) {
    return (
      <main className="page page-narrow">
        <p role="alert">Não foi possível carregar a agenda.</p>
      </main>
    );
  }

  const savedServices = settings.data.services.flatMap((service) =>
    service.id ? [{ id: service.id, name: service.name }] : [],
  );

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Agenda</h1>
          <p>Acompanhe as reservas dos seus clientes e configure o que você atende.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Seções da agenda">
        <button
          type="button"
          role="tab"
          id="tab-bookings"
          aria-selected={tab === 'bookings'}
          aria-controls="panel-bookings"
          onClick={() => setTab('bookings')}
        >
          <Icon name="calendar" />
          Reservas
        </button>
        <button
          type="button"
          role="tab"
          id="tab-settings"
          aria-selected={tab === 'settings'}
          aria-controls="panel-settings"
          onClick={() => setTab('settings')}
        >
          <Icon name="pencil" />
          Serviços e horários
        </button>
      </div>

      <div
        role="tabpanel"
        id="panel-bookings"
        aria-labelledby="tab-bookings"
        hidden={tab !== 'bookings'}
      >
        <BookingsPanel timezone={settings.data.timezone} services={savedServices} />
      </div>
      <div
        role="tabpanel"
        id="panel-settings"
        aria-labelledby="tab-settings"
        hidden={tab !== 'settings'}
      >
        <SettingsForm initial={settings.data} />
      </div>
    </main>
  );
}
