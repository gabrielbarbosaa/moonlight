'use client';

import type { BookingConfirmation, BookingSlot, PublicBookingInfo } from '@sitebuilder/schemas';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DAYS_PER_PAGE = 7;

function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

function dayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
}

function dayLabel(iso: string, timeZone: string) {
  const label = new Date(iso).toLocaleDateString('pt-BR', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function timeLabel(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AgendaPage() {
  const params = useParams<{ tenant: string }>();
  const slug = params.tenant;

  const [info, setInfo] = useState<PublicBookingInfo | null>(null);
  const [loadError, setLoadError] = useState<'notfound' | 'error' | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [offset, setOffset] = useState(0);
  const [slots, setSlots] = useState<BookingSlot[] | null>(null);
  const [selected, setSelected] = useState<BookingSlot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/booking/public/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404 || response.status === 400) return setLoadError('notfound');
        if (!response.ok) return setLoadError('error');
        const data: PublicBookingInfo = await response.json();
        setInfo(data);
        setServiceId(data.services[0]?.id ?? '');
      })
      .catch(() => !cancelled && setLoadError('error'));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const loadSlots = useCallback(async () => {
    if (!info || !serviceId) return;
    setSlots(null);
    const from = addDays(todayIn(info.timezone), offset);
    try {
      const response = await fetch(
        `${API_URL}/booking/public/${encodeURIComponent(slug)}/slots?serviceId=${serviceId}&from=${from}&days=${DAYS_PER_PAGE}`,
      );
      setSlots(response.ok ? await response.json() : []);
    } catch {
      setSlots([]);
    }
  }, [info, serviceId, offset, slug]);

  useEffect(() => {
    setSelected(null);
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    setFormError(null);
    try {
      const response = await fetch(`${API_URL}/booking/public/${encodeURIComponent(slug)}/book`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          startsAt: selected.startsAt,
          name,
          email,
          notes: notes.trim() || undefined,
        }),
      });
      if (response.ok) {
        setConfirmation(await response.json());
      } else if (response.status === 409) {
        setFormError('Esse horário acabou de ser reservado. Escolha outro.');
        setSelected(null);
        loadSlots();
      } else if (response.status === 429) {
        setFormError('Muitas tentativas. Tente novamente mais tarde.');
      } else if (response.status === 400) {
        setFormError('Confira seu nome e e-mail.');
      } else {
        setFormError('Não foi possível reservar. Tente novamente.');
      }
    } catch {
      setFormError('Não foi possível falar com o servidor.');
    } finally {
      setSending(false);
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
    return (
      <main className="page page-narrow">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <span
            className="icon-tile"
            style={{
              width: 56,
              height: 56,
              color: 'var(--success)',
              background: 'var(--success-soft)',
              borderRadius: 999,
            }}
          >
            <Icon name="check" style={{ width: 26, height: 26 }} />
          </span>
          <h1 style={{ margin: '16px 0 8px' }}>Reserva confirmada</h1>
          <p style={{ margin: 0 }}>
            {confirmation.serviceName} em{' '}
            <strong>
              {dayLabel(confirmation.startsAt, info.timezone)} às{' '}
              {timeLabel(confirmation.startsAt, info.timezone)}
            </strong>
            .
          </p>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Enviamos a confirmação para o seu e-mail.
          </p>
        </div>
      </main>
    );
  }

  const service = info.services.find((item) => item.id === serviceId);

  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Agendar com {info.name}</h1>
          <p>Escolha o serviço e um horário livre.</p>
        </div>
      </div>

      <div className="card">
        <label className="field" style={{ marginTop: 0 }}>
          Serviço
          <select
            value={serviceId}
            onChange={(event) => {
              setServiceId(event.target.value);
              setOffset(0);
            }}
          >
            {info.services.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.durationMinutes} min)
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Horários no fuso {info.timezone}.</p>

        <div className="row" style={{ justifyContent: 'space-between', margin: '16px 0 4px' }}>
          <strong>Horários disponíveis</strong>
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

        {slots === null && <p className="muted">Carregando horários...</p>}
        {slots !== null && grouped.size === 0 && (
          <div className="empty" style={{ marginTop: 8 }}>
            Nenhum horário livre neste período.
          </div>
        )}
        {[...grouped.entries()].map(([key, daySlots]) => (
          <section key={key} style={{ marginTop: 14 }}>
            <h2 style={{ fontSize: '0.95rem', margin: '0 0 6px' }}>
              {dayLabel(daySlots[0].startsAt, info.timezone)}
            </h2>
            <div className="option-row" style={{ marginTop: 0 }}>
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
          </section>
        ))}
      </div>

      {selected && (
        <form onSubmit={submit} className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            <strong>
              {service?.name} · {dayLabel(selected.startsAt, info.timezone)} às{' '}
              {timeLabel(selected.startsAt, info.timezone)}
            </strong>
          </p>
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
          <button
            type="submit"
            className="btn-lg"
            disabled={sending}
            style={{ width: '100%', marginTop: 18 }}
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
    </main>
  );
}
