'use client';

import type { BookingConfirmation, BookingSlot, PublicBookingInfo } from '@moonlight/schemas';
import { MAX_EXTRA_SERVICES } from '@moonlight/schemas';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';
import { useTenantBase } from '@/lib/use-tenant-base';
import {
  API_URL,
  addDays,
  dateTimeLabel,
  dayKey,
  dayLabel,
  dayNumber,
  durationLabel,
  monthShort,
  noticeText,
  request,
  timeLabel,
  todayIn,
  weekdayShort,
} from '@/lib/booking-public';

const DAYS_PER_PAGE = 7;

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const items = ['Serviços', 'Data e horário', 'Seus dados'];
  return (
    <ol className="bk-steps" aria-label="Etapas">
      {items.map((label, index) => {
        const number = index + 1;
        const state = number < current ? 'done' : number === current ? 'active' : 'todo';
        return (
          <li key={label} data-state={state} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="bk-dot">{state === 'done' ? <Icon name="check" /> : number}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function LookupForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState('sending');
    const result = await request(`/booking/public/${encodeURIComponent(slug)}/lookup`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (result.status === 202 || result.status === 200) setState('sent');
    else {
      setState('error');
      setMessage(
        result.status === 429
          ? 'Muitas tentativas. Tente de novo mais tarde.'
          : 'Confira o e-mail e tente novamente.',
      );
    }
  };

  return (
    <section className="card bk-lookup">
      <h2>Já tem uma reserva?</h2>
      <p className="muted">
        Informe o e-mail usado na reserva e enviamos o link para ver, cancelar ou adicionar
        serviços.
      </p>
      {state === 'sent' ? (
        <p role="status">
          Se houver reservas futuras nesse e-mail, enviamos os links agora. Confira a caixa de
          entrada.
        </p>
      ) : (
        <form onSubmit={submit} className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: 1, minWidth: 220, margin: 0 }}>
            Seu e-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Enviando...' : 'Receber link'}
          </button>
        </form>
      )}
      {state === 'error' && message && <p className="error-text">{message}</p>}
    </section>
  );
}

export default function AgendaPage() {
  const params = useParams<{ tenant: string }>();
  const slug = params.tenant;
  const tenantBase = useTenantBase(slug);

  const [info, setInfo] = useState<PublicBookingInfo | null>(null);
  const [loadError, setLoadError] = useState<'notfound' | 'error' | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [slots, setSlots] = useState<BookingSlot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookingSlot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    let cancelled = false;
    request<PublicBookingInfo>(`/booking/public/${encodeURIComponent(slug)}`).then((result) => {
      if (cancelled) return;
      if (result.status === 404 || result.status === 400) return setLoadError('notfound');
      if (!result.data) return setLoadError('error');
      setInfo(result.data);
      setSelectedIds(result.data.services[0] ? [result.data.services[0].id] : []);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const chosen = useMemo(
    () =>
      selectedIds
        .map((id) => info?.services.find((item) => item.id === id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [selectedIds, info],
  );
  const totalMinutes = chosen.reduce((sum, item) => sum + item.durationMinutes, 0);

  const loadSlots = useCallback(async () => {
    if (!info || selectedIds.length === 0) return;
    setSlots(null);
    const [primary, ...extras] = selectedIds;
    const from = addDays(todayIn(info.timezone), offset);
    const query = new URLSearchParams({ serviceId: primary, from, days: String(DAYS_PER_PAGE) });
    if (extras.length > 0) query.set('extraIds', extras.join(','));
    const result = await request<BookingSlot[]>(
      `/booking/public/${encodeURIComponent(slug)}/slots?${query.toString()}`,
    );
    setSlots(result.data ?? []);
  }, [info, selectedIds, offset, slug]);

  useEffect(() => {
    setSelected(null);
    setDay(null);
    loadSlots();
  }, [loadSlots]);

  const grouped = useMemo(() => {
    const groups = new Map<string, BookingSlot[]>();
    if (!info || !slots) return groups;
    for (const slot of slots) {
      const key = dayKey(slot.startsAt, info.timezone);
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return groups;
  }, [slots, info]);

  const visibleDays = useMemo(() => {
    if (!info) return [];
    const start = addDays(todayIn(info.timezone), offset);
    return Array.from({ length: DAYS_PER_PAGE }, (_, index) => addDays(start, index));
  }, [info, offset]);

  useEffect(() => {
    if (day || grouped.size === 0) return;
    setDay([...grouped.keys()][0]);
  }, [grouped, day]);

  const toggleService = (id: string) => {
    setOffset(0);
    setFormError(null);
    setSelectedIds((current) => {
      if (current.includes(id))
        return current.length === 1 ? current : current.filter((x) => x !== id);
      if (current.length >= MAX_EXTRA_SERVICES + 1) return current;
      return [...current, id];
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    setFormError(null);
    const [primary, ...extras] = selectedIds;
    const result = await request<BookingConfirmation>(
      `/booking/public/${encodeURIComponent(slug)}/book`,
      {
        method: 'POST',
        body: JSON.stringify({
          serviceId: primary,
          extraServiceIds: extras,
          startsAt: selected.startsAt,
          name,
          email,
          notes: notes.trim() || undefined,
        }),
      },
    );
    setSending(false);
    if (result.data) return setConfirmation(result.data);
    if (result.status === 409) {
      setFormError('Esse horário acabou de ser reservado. Escolha outro.');
      setSelected(null);
      loadSlots();
    } else if (result.status === 429) {
      setFormError('Muitas tentativas. Tente novamente mais tarde.');
    } else if (result.status === 400) {
      setFormError('Confira seu nome e e-mail.');
    } else {
      setFormError(result.message ?? 'Não foi possível reservar. Tente novamente.');
    }
  };

  if (loadError === 'notfound') {
    return (
      <main className="page page-narrow">
        <div className="card" style={{ textAlign: 'center' }}>
          <h1>Agenda indisponível</h1>
          <p className="muted" style={{ margin: 0 }}>
            Esta página não aceita reservas no momento.
          </p>
        </div>
      </main>
    );
  }

  if (loadError === 'error') {
    return (
      <main className="page page-narrow">
        <p role="alert">Não foi possível carregar a agenda.</p>
      </main>
    );
  }

  if (!info) {
    return (
      <main className="page page-narrow">
        <p className="muted">Carregando...</p>
      </main>
    );
  }

  if (confirmation) {
    const manageHref = `${tenantBase}/agenda/reserva/${confirmation.manageToken}`;
    return (
      <main className="page page-narrow">
        <div className="card bk-success">
          <span className="bk-success-icon">
            <Icon name="check" />
          </span>
          <h1>Reserva confirmada</h1>
          <p className="bk-when">{dateTimeLabel(confirmation.startsAt, info.timezone)}</p>
          <ul className="bk-lines">
            {confirmation.services.map((service) => (
              <li key={service.name}>
                <span>{service.name}</span>
                <span className="muted">{durationLabel(service.durationMinutes)}</span>
              </li>
            ))}
            {confirmation.services.length > 1 && (
              <li className="bk-total">
                <span>Duração total</span>
                <span>{durationLabel(confirmation.totalMinutes)}</span>
              </li>
            )}
          </ul>
          <div className="bk-actions">
            <Link href={manageHref} className="btn btn-primary btn-lg">
              Ver ou alterar minha reserva
            </Link>
            <a
              className="btn btn-lg"
              href={`${API_URL}/booking/manage/${confirmation.manageToken}/calendar.ics`}
            >
              <Icon name="calendar" />
              Adicionar ao calendário
            </a>
          </div>
          <p className="muted" style={{ margin: '18px 0 0', fontSize: '0.9rem' }}>
            Enviamos a confirmação, com o link da reserva, para o seu e-mail. Guarde esse link: é
            por ele que você cancela ou adiciona serviços.
          </p>
        </div>
      </main>
    );
  }

  const step: 1 | 2 | 3 = selected ? 3 : 2;
  const daySlots = day ? (grouped.get(day) ?? []) : [];

  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Agendar com {info.name}</h1>
          <p>Escolha o que você precisa e um horário livre.</p>
        </div>
      </div>

      <Steps current={step} />

      <section className="card">
        <h2>1. Serviços</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Você pode combinar até {MAX_EXTRA_SERVICES + 1} serviços na mesma visita.
        </p>
        <div className="bk-service-list">
          {info.services.map((item) => {
            const active = selectedIds.includes(item.id);
            const blocked = !active && selectedIds.length >= MAX_EXTRA_SERVICES + 1;
            return (
              <button
                key={item.id}
                type="button"
                className="bk-service"
                aria-pressed={active}
                disabled={blocked}
                onClick={() => toggleService(item.id)}
              >
                <span className="bk-check">{active && <Icon name="check" />}</span>
                <span className="bk-service-name">{item.name}</span>
                <span className="muted">{durationLabel(item.durationMinutes)}</span>
              </button>
            );
          })}
        </div>
        <p className="bk-total-line">
          <strong>{chosen.length === 1 ? '1 serviço' : `${chosen.length} serviços`}</strong>
          <span className="muted"> · {durationLabel(totalMinutes)} no total</span>
        </p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>2. Data e horário</h2>
          <div className="segmented" role="group" aria-label="Navegar pelos dias">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(offset - DAYS_PER_PAGE)}
              aria-label="Dias anteriores"
            >
              <Icon name="up" style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <button
              type="button"
              disabled={offset + DAYS_PER_PAGE >= info.maxDaysAhead}
              onClick={() => setOffset(offset + DAYS_PER_PAGE)}
              aria-label="Próximos dias"
            >
              <Icon name="up" style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>
        </div>
        <p className="hint">Horários no fuso {info.timezone}.</p>

        <div className="bk-days">
          {visibleDays.map((date) => {
            const count = grouped.get(date)?.length ?? 0;
            return (
              <button
                key={date}
                type="button"
                className="bk-day"
                aria-pressed={day === date}
                disabled={slots === null || count === 0}
                onClick={() => {
                  setDay(date);
                  setSelected(null);
                }}
              >
                <small>{weekdayShort(date)}</small>
                <strong>{dayNumber(date)}</strong>
                <small>{monthShort(date)}</small>
                <span className="bk-count">
                  {slots === null ? '·' : count === 0 ? 'cheio' : `${count}`}
                </span>
              </button>
            );
          })}
        </div>

        {slots === null && <p className="muted">Carregando horários...</p>}
        {slots !== null && grouped.size === 0 && (
          <div className="empty" style={{ marginTop: 12 }}>
            Nenhum horário livre neste período para essa combinação. Tente outros dias ou menos
            serviços.
          </div>
        )}
        {daySlots.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <strong style={{ fontSize: '0.95rem' }}>
              {dayLabel(daySlots[0].startsAt, info.timezone)}
            </strong>
            <div className="bk-times">
              {daySlots.map((slot) => (
                <button
                  key={slot.startsAt}
                  type="button"
                  aria-pressed={selected?.startsAt === slot.startsAt}
                  onClick={() => setSelected(slot)}
                >
                  {timeLabel(slot.startsAt, info.timezone)}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {selected && (
        <form onSubmit={submit} className="card" style={{ marginTop: 16 }}>
          <h2>3. Seus dados</h2>
          <div className="bk-summary">
            <strong>{dayLabel(selected.startsAt, info.timezone)}</strong>
            <span>
              {timeLabel(selected.startsAt, info.timezone)} às{' '}
              {timeLabel(selected.endsAt, info.timezone)} · {chosen.map((s) => s.name).join(' + ')}
            </span>
          </div>
          <label className="field">
            Seu nome
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            Seu e-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <span className="hint" style={{ display: 'block' }}>
              Enviamos a confirmação e o link para gerenciar a reserva.
            </span>
          </label>
          <label className="field">
            Observações (opcional)
            <textarea
              rows={3}
              maxLength={300}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <p className="hint">
            Você poderá cancelar pelo link {noticeText(info.cancelNoticeHours)} do horário.
          </p>
          <button
            type="submit"
            className="btn-lg"
            disabled={sending}
            style={{ width: '100%', marginTop: 8 }}
          >
            {sending ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </form>
      )}

      {formError && (
        <p role="alert" style={{ marginTop: 16 }}>
          {formError}
        </p>
      )}

      <LookupForm slug={slug} />
    </main>
  );
}
