'use client';

import {
  WEEKDAY_LABELS,
  bookingSettingsSchema,
  type BookingSettingsInput,
} from '@sitebuilder/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { billingApi, bookingApi, getErrorMessage } from '@/lib/api';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
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
      <div className="page-head">
        <div>
          <h1>Agenda</h1>
          <p>Defina o que você atende e quando. Seus clientes reservam pela sua página.</p>
        </div>
        <div className="row">
          {saved && <span role="status">Agenda salva</span>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={save.isPending}
          >
            {save.isPending ? 'Salvando...' : 'Salvar agenda'}
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
                {DURATIONS.map((minutes) => (
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

function BookingsList({ timezone }: { timezone: string }) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [confirming, setConfirming] = useState<string | null>(null);
  const bookings = useQuery({
    queryKey: ['bookings', scope],
    queryFn: () => bookingApi.listBookings(scope),
  });
  const cancel = useMutation({
    mutationFn: bookingApi.cancel,
    onSuccess: () => {
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  return (
    <section>
      <div className="page-head" style={{ margin: '32px 0 12px' }}>
        <h2 style={{ margin: 0 }}>Reservas</h2>
        <div className="segmented" role="group" aria-label="Filtro">
          <button
            type="button"
            aria-pressed={scope === 'upcoming'}
            onClick={() => setScope('upcoming')}
          >
            Próximas
          </button>
          <button type="button" aria-pressed={scope === 'past'} onClick={() => setScope('past')}>
            Anteriores
          </button>
        </div>
      </div>
      {cancel.isError && <p role="alert">{getErrorMessage(cancel.error)}</p>}
      {bookings.isPending && <p className="muted">Carregando...</p>}
      {bookings.isError && <p role="alert">{getErrorMessage(bookings.error)}</p>}
      {bookings.data && bookings.data.length === 0 && (
        <div className="empty">
          {scope === 'upcoming'
            ? 'Nenhuma reserva futura por enquanto.'
            : 'Nenhuma reserva anterior.'}
        </div>
      )}
      {bookings.data && bookings.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Quando</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Serviço</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px 14px' }}></th>
              </tr>
            </thead>
            <tbody>
              {bookings.data.map((booking) => (
                <tr key={booking.id}>
                  <td style={{ padding: '12px 14px' }}>
                    {new Date(booking.startsAt).toLocaleString('pt-BR', {
                      timeZone: timezone,
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td style={{ padding: '12px 14px' }}>{booking.serviceName}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {booking.customerName}
                    <div className="hint" style={{ margin: 0 }}>
                      {booking.customerEmail}
                    </div>
                    {booking.notes && <div className="hint">{booking.notes}</div>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      className={
                        booking.status === 'CONFIRMED'
                          ? 'badge badge-success'
                          : 'badge badge-danger'
                      }
                    >
                      {booking.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    {booking.status === 'CONFIRMED' &&
                      scope === 'upcoming' &&
                      (confirming === booking.id ? (
                        <span className="row" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-danger"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(booking.id)}
                          >
                            Confirmar cancelamento
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AgendaAdminPage() {
  const router = useRouter();
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

  return (
    <main className="page">
      <SettingsForm initial={settings.data} />
      <BookingsList timezone={settings.data.timezone} />
    </main>
  );
}
