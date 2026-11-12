export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

export function dayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function dayLabel(iso: string, timeZone: string) {
  return capitalize(
    new Date(iso).toLocaleDateString('pt-BR', {
      timeZone,
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }),
  );
}

export function weekdayShort(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return capitalize(
    new Date(Date.UTC(year, month - 1, day))
      .toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short' })
      .replace('.', ''),
  );
}

export function dayNumber(date: string) {
  return date.slice(8, 10);
}

export function monthShort(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'short' })
    .replace('.', '');
}

export function timeLabel(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dateTimeLabel(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

export function noticeText(hours: number) {
  if (hours === 0) return 'até o horário marcado';
  return hours === 1 ? 'até 1 hora antes' : `até ${hours} horas antes`;
}

export type ApiResult<T> = { status: number; data: T | null; message: string | null };

export async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const message =
      !response.ok && data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : null;
    return { status: response.status, data: response.ok ? (data as T) : null, message };
  } catch {
    return { status: 0, data: null, message: 'Não foi possível falar com o servidor.' };
  }
}
