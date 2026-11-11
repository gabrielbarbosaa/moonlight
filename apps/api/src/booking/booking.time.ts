const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / MS_PER_MINUTE);
}

export function zonedTimeToUtc(date: string, minutes: number, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const localMs = Date.UTC(year, month - 1, day, 0, minutes);
  const firstGuess = localMs - offsetMinutes(localMs, timeZone) * MS_PER_MINUTE;
  return new Date(localMs - offsetMinutes(firstGuess, timeZone) * MS_PER_MINUTE);
}

export function localDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isRealDate(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function formatInZone(instant: Date, timeZone: string): string {
  return instant.toLocaleString('pt-BR', { timeZone, dateStyle: 'full', timeStyle: 'short' });
}
