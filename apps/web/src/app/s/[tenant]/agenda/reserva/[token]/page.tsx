'use client';

import type { ManagedBooking } from '@moonlight/schemas';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { useTenantBase } from '@/lib/use-tenant-base';
import {
  API_URL,
  dateTimeLabel,
  durationLabel,
  noticeText,
  request,
  timeLabel,
} from '@/lib/booking-public';

const STATUS_LABEL = {
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Concluída',
} as const;

const STATUS_CLASS = {
  CONFIRMED: 'badge badge-success',
  CANCELLED: 'badge badge-danger',
  COMPLETED: 'badge',
} as const;

export default function ManageBookingPage() {
  const params = useParams<{ tenant: string; token: string }>();
  const { tenant: slug, token } = params;
  const tenantBase = useTenantBase(slug);

  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'notfound' | 'error'>('loading');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(async () => {
    const result = await request<ManagedBooking>(`/booking/manage/${encodeURIComponent(token)}`);
    if (result.data) {
      setBooking(result.data);
      return;
    }
    setLoadState(result.status === 404 || result.status === 400 ? 'notfound' : 'error');
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (
    key: string,
    path: string,
    init: RequestInit,
    success: string,
  ): Promise<void> => {
    setBusy(key);
    setMessage(null);
    const result = await request<ManagedBooking>(path, init);
    setBusy(null);
    if (result.data) {
      setBooking(result.data);
      setMessage({ kind: 'ok', text: success });
    } else {
      setMessage({ kind: 'error', text: result.message ?? 'Não foi possível concluir a ação.' });
      load();
    }
  };

  if (!booking) {
    return (
      <main className="page page-narrow">
        {loadState === 'loading' && <p className="muted">Carregando...</p>}
        {loadState === 'error' && <p role="alert">Não foi possível carregar a reserva.</p>}
        {loadState === 'notfound' && (
          <div className="card" style={{ textAlign: 'center' }}>
            <h1>Reserva não encontrada</h1>
            <p className="muted">
              O link pode estar incorreto ou ter sido substituído por um mais novo. Peça um novo
              link pelo seu e-mail na página de agendamento.
            </p>
            <Link href={`${tenantBase}/agenda`} className="btn btn-primary">
              Ir para a agenda
            </Link>
          </div>
        )}
      </main>
    );
  }

  const zone = booking.tenant.timezone;
  const active = booking.status === 'CONFIRMED';
  const base = `/booking/manage/${encodeURIComponent(token)}`;

  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Minha reserva</h1>
          <p>{booking.tenant.name}</p>
        </div>
        <span className={STATUS_CLASS[booking.status]}>{STATUS_LABEL[booking.status]}</span>
      </div>

      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} style={{ marginBottom: 16 }}>
          {message.text}
        </p>
      )}

      {booking.status === 'CANCELLED' && (
        <p role="alert" style={{ marginBottom: 16 }}>
          {booking.cancelledBy === 'OWNER'
            ? `Esta reserva foi cancelada por ${booking.tenant.name}.`
            : 'Você cancelou esta reserva. O horário foi liberado.'}
        </p>
      )}
      {booking.status === 'COMPLETED' && (
        <p className="muted" style={{ marginBottom: 16 }}>
          Esta reserva já aconteceu.
        </p>
      )}

      <section className="card bk-booking" data-status={booking.status}>
        <p className="bk-when">{dateTimeLabel(booking.startsAt, zone)}</p>
        <p className="muted" style={{ margin: 0 }}>
          Das {timeLabel(booking.startsAt, zone)} às {timeLabel(booking.endsAt, zone)} ·{' '}
          {durationLabel(booking.totalMinutes)}
        </p>

        <h2 style={{ marginTop: 22 }}>Serviços</h2>
        <ul className="bk-lines">
          {booking.services.map((service) => (
            <li key={`${service.id}-${service.extraId ?? 'main'}`}>
              <span>
                {service.name}
                {service.extraId && <span className="badge bk-extra-badge">adicional</span>}
              </span>
              <span className="row" style={{ gap: 10 }}>
                <span className="muted">{durationLabel(service.durationMinutes)}</span>
                {service.extraId && booking.canRemoveServices && (
                  <button
                    type="button"
                    className="btn-ghost btn-danger"
                    disabled={busy !== null}
                    aria-label={`Remover ${service.name}`}
                    onClick={() =>
                      act(
                        `remove-${service.extraId}`,
                        `${base}/services/${service.extraId}`,
                        { method: 'DELETE' },
                        `Serviço removido: ${service.name}.`,
                      )
                    }
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </span>
            </li>
          ))}
          {booking.services.length > 1 && (
            <li className="bk-total">
              <span>Duração total</span>
              <span>{durationLabel(booking.totalMinutes)}</span>
            </li>
          )}
        </ul>

        {booking.notes && (
          <>
            <h2 style={{ marginTop: 22 }}>Observações</h2>
            <p style={{ margin: 0 }}>{booking.notes}</p>
          </>
        )}
      </section>

      {active && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Adicionar serviço</h2>
          {booking.canAddServices && booking.addable.length > 0 ? (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                O serviço entra logo depois do que você já marcou, só se houver horário livre.
              </p>
              <ul className="bk-lines">
                {booking.addable.map((service) => (
                  <li key={service.id}>
                    <span>
                      {service.name}
                      <span className="muted"> · +{durationLabel(service.durationMinutes)}</span>
                      {!service.available && (
                        <span className="hint" style={{ display: 'block', margin: 0 }}>
                          Sem horário livre logo depois da sua reserva.
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={!service.available || busy !== null}
                      onClick={() =>
                        act(
                          `add-${service.id}`,
                          `${base}/services`,
                          { method: 'POST', body: JSON.stringify({ serviceId: service.id }) },
                          `Serviço adicionado: ${service.name}.`,
                        )
                      }
                    >
                      {busy === `add-${service.id}` ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {booking.canAddServices
                ? 'Todos os serviços disponíveis já estão na sua reserva.'
                : 'Não é possível adicionar mais serviços a esta reserva.'}
            </p>
          )}
        </section>
      )}

      {active && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Cancelar</h2>
          {booking.canCancel ? (
            confirmingCancel ? (
              <div>
                <p style={{ marginTop: 0 }}>
                  Tem certeza? O horário volta a ficar livre para outros clientes.
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={busy !== null}
                    onClick={() =>
                      act('cancel', `${base}/cancel`, { method: 'POST' }, 'Reserva cancelada.')
                    }
                  >
                    {busy === 'cancel' ? 'Cancelando...' : 'Sim, cancelar reserva'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setConfirmingCancel(false)}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 0 }}>
                  Você pode cancelar {noticeText(booking.cancelNoticeHours)} do horário, ou seja,
                  até {dateTimeLabel(booking.cancelDeadline, zone)}.
                </p>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setConfirmingCancel(true)}
                >
                  Cancelar reserva
                </button>
              </>
            )
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              O prazo para cancelar online ({noticeText(booking.cancelNoticeHours)}) já passou. Para
              cancelar, entre em contato com {booking.tenant.name}.
            </p>
          )}
        </section>
      )}

      <div className="bk-actions" style={{ marginTop: 20 }}>
        {active && (
          <a className="btn" href={`${API_URL}${base}/calendar.ics`}>
            <Icon name="calendar" />
            Adicionar ao calendário
          </a>
        )}
        <Link className="btn" href={`${tenantBase}/agenda`}>
          Fazer nova reserva
        </Link>
        <Link className="btn btn-ghost" href={tenantBase || '/'}>
          Voltar para a página de {booking.tenant.name}
        </Link>
      </div>
    </main>
  );
}
