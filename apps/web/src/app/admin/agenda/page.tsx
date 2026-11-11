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
import { billingApi, bookingApi, getErrorMessage } from '@/lib/api';

const mainStyle = { maxWidth: 820, margin: '48px auto', padding: '0 16px' } as const;
const errorStyle = { color: '#b00020' } as const;
const cellStyle = {
  padding: '6px 8px',
  borderBottom: '1px solid #eee',
  textAlign: 'left',
} as const;
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
    <section>
      {!entitled && (
        <p
          role="alert"
          style={{ border: '1px solid #b45309', color: '#b45309', padding: 12, borderRadius: 8 }}
        >
          A agenda de reservas faz parte do plano Pro. Sua agenda fica desativada para os visitantes
          até a assinatura. <Link href="/admin/billing">Ver planos</Link>
        </p>
      )}
      <label style={{ display: 'block', margin: '12px 0' }}>
        <input
          type="checkbox"
          disabled={!entitled}
          checked={settings.enabled}
          onChange={(event) => edit({ ...settings, enabled: event.target.checked })}
        />{' '}
        Aceitar reservas na minha página
      </label>

      <label style={{ display: 'block', margin: '12px 0' }}>
        Fuso horário{' '}
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

      <fieldset style={{ border: '1px solid #ddd', borderRadius: 8 }}>
        <legend>Serviços</legend>
        {settings.services.map((service, index) => (
          <p
            key={service.id ?? `new-${index}`}
            style={{ display: 'flex', gap: 8, margin: '6px 0' }}
          >
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
              style={{ flex: 1 }}
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
              onClick={() =>
                edit({ ...settings, services: settings.services.filter((_, i) => i !== index) })
              }
            >
              Remover
            </button>
          </p>
        ))}
        <p>
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
            Adicionar serviço
          </button>
        </p>
      </fieldset>

      <fieldset style={{ border: '1px solid #ddd', borderRadius: 8, marginTop: 16 }}>
        <legend>Horários de atendimento</legend>
        {WEEKDAY_LABELS.map((label, weekday) => {
          const entries = settings.rules
            .map((rule, index) => ({ rule, index }))
            .filter((entry) => entry.rule.weekday === weekday);
          return (
            <div key={label} style={{ margin: '8px 0' }}>
              <strong>{label}</strong>{' '}
              <button
                type="button"
                onClick={() =>
                  edit({
                    ...settings,
                    rules: [...settings.rules, { weekday, startMinute: 540, endMinute: 1080 }],
                  })
                }
              >
                Adicionar janela
              </button>
              {entries.map(({ rule, index }) => (
                <span key={index} style={{ display: 'inline-flex', gap: 4, marginLeft: 12 }}>
                  <input
                    type="time"
                    aria-label={`${label} início`}
                    value={toTime(rule.startMinute)}
                    onChange={(event) =>
                      updateRule(index, { startMinute: fromTime(event.target.value) })
                    }
                  />
                  às
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
                    aria-label={`Remover janela de ${label}`}
                    onClick={() =>
                      edit({ ...settings, rules: settings.rules.filter((_, i) => i !== index) })
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          );
        })}
      </fieldset>

      {errors.length > 0 && (
        <ul style={errorStyle}>
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {save.isError && <p style={errorStyle}>{getErrorMessage(save.error)}</p>}

      <p>
        <button type="button" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Salvando...' : 'Salvar agenda'}
        </button>{' '}
        {saved && <span role="status">Agenda salva.</span>}
      </p>
    </section>
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
      <p>
        <button type="button" disabled={scope === 'upcoming'} onClick={() => setScope('upcoming')}>
          Próximas
        </button>{' '}
        <button type="button" disabled={scope === 'past'} onClick={() => setScope('past')}>
          Anteriores
        </button>
      </p>
      {cancel.isError && <p style={errorStyle}>{getErrorMessage(cancel.error)}</p>}
      {bookings.isPending && <p>Carregando...</p>}
      {bookings.isError && <p style={errorStyle}>{getErrorMessage(bookings.error)}</p>}
      {bookings.data && bookings.data.length === 0 && <p>Nenhuma reserva.</p>}
      {bookings.data && bookings.data.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={cellStyle}>Quando</th>
              <th style={cellStyle}>Serviço</th>
              <th style={cellStyle}>Cliente</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}></th>
            </tr>
          </thead>
          <tbody>
            {bookings.data.map((booking) => (
              <tr key={booking.id}>
                <td style={cellStyle}>
                  {new Date(booking.startsAt).toLocaleString('pt-BR', {
                    timeZone: timezone,
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td style={cellStyle}>{booking.serviceName}</td>
                <td style={cellStyle}>
                  {booking.customerName}
                  <div style={{ fontSize: 13, color: '#555' }}>{booking.customerEmail}</div>
                  {booking.notes && <div style={{ fontSize: 13 }}>{booking.notes}</div>}
                </td>
                <td style={cellStyle}>
                  {booking.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                </td>
                <td style={cellStyle}>
                  {booking.status === 'CONFIRMED' &&
                    scope === 'upcoming' &&
                    (confirming === booking.id ? (
                      <>
                        <button
                          type="button"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate(booking.id)}
                        >
                          Confirmar cancelamento
                        </button>{' '}
                        <button type="button" onClick={() => setConfirming(null)}>
                          Voltar
                        </button>
                      </>
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
      <main style={mainStyle}>
        <p>Carregando...</p>
      </main>
    );
  }

  if (settings.isError) {
    return (
      <main style={mainStyle}>
        <p style={errorStyle}>Não foi possível carregar a agenda.</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <p>
        <Link href="/admin">← Painel</Link>
      </p>
      <h1>Agenda</h1>
      <SettingsForm initial={settings.data} />
      <h2>Reservas</h2>
      <BookingsList timezone={settings.data.timezone} />
    </main>
  );
}
