'use client';

import type { BookingConfirmation, BookingSlot, PublicBookingInfo } from '@sitebuilder/schemas';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DAYS_PER_PAGE = 7;

const mainStyle = { maxWidth: 560, margin: '48px auto', padding: '0 16px' } as const;
const fieldStyle = {
  display: 'block',
  width: '100%',
  padding: 8,
  marginTop: 4,
  boxSizing: 'border-box',
} as const;
const errorStyle = { color: '#b00020' } as const;

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
      <main style={mainStyle}>
        <h1>Agenda indisponível</h1>
        <p>Esta página não aceita reservas no momento.</p>
      </main>
    );
  }

  if (loadError === 'error') {
    return (
      <main style={mainStyle}>
        <p style={errorStyle}>Não foi possível carregar a agenda.</p>
      </main>
    );
  }

  if (!info) {
    return (
      <main style={mainStyle}>
        <p>Carregando...</p>
      </main>
    );
  }

  if (confirmation) {
    return (
      <main style={mainStyle}>
        <h1>Reserva confirmada</h1>
        <p>
          {confirmation.serviceName} em{' '}
          <strong>
            {dayLabel(confirmation.startsAt, info.timezone)} às{' '}
            {timeLabel(confirmation.startsAt, info.timezone)}
          </strong>
          . Enviamos a confirmação para o seu e-mail.
        </p>
      </main>
    );
  }

  const service = info.services.find((item) => item.id === serviceId);

  return (
    <main style={mainStyle}>
      <h1>Agendar com {info.name}</h1>

      <label style={{ display: 'block' }}>
        Serviço
        <select
          value={serviceId}
          onChange={(event) => {
            setServiceId(event.target.value);
            setOffset(0);
          }}
          style={fieldStyle}
        >
          {info.services.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.durationMinutes} min)
            </option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: 13, color: '#555' }}>Horários no fuso {info.timezone}.</p>

      <p>
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => setOffset(offset - DAYS_PER_PAGE)}
        >
          Dias anteriores
        </button>{' '}
        <button
          type="button"
          disabled={offset + DAYS_PER_PAGE >= info.maxDaysAhead}
          onClick={() => setOffset(offset + DAYS_PER_PAGE)}
        >
          Próximos dias
        </button>
      </p>

      {slots === null && <p>Carregando horários...</p>}
      {slots !== null && grouped.size === 0 && <p>Nenhum horário livre neste período.</p>}
      {[...grouped.entries()].map(([key, daySlots]) => (
        <section key={key} style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, margin: '12px 0 6px' }}>
            {dayLabel(daySlots[0].startsAt, info.timezone)}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {daySlots.map((slot) => (
              <button
                key={slot.startsAt}
                type="button"
                aria-pressed={selected?.startsAt === slot.startsAt}
                onClick={() => setSelected(slot)}
                style={{
                  padding: '6px 10px',
                  fontWeight: selected?.startsAt === slot.startsAt ? 700 : 400,
                  outline: selected?.startsAt === slot.startsAt ? '2px solid #4f46e5' : undefined,
                }}
              >
                {timeLabel(slot.startsAt, info.timezone)}
              </button>
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <form
          onSubmit={submit}
          style={{ marginTop: 24, borderTop: '1px solid #ddd', paddingTop: 16 }}
        >
          <p>
            <strong>
              {service?.name} · {dayLabel(selected.startsAt, info.timezone)} às{' '}
              {timeLabel(selected.startsAt, info.timezone)}
            </strong>
          </p>
          <label style={{ display: 'block' }}>
            Seu nome
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            Seu e-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            Observações (opcional)
            <textarea
              rows={3}
              maxLength={300}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <button type="submit" disabled={sending} style={{ marginTop: 16, padding: 10 }}>
            {sending ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </form>
      )}

      {formError && <p style={errorStyle}>{formError}</p>}
    </main>
  );
}
