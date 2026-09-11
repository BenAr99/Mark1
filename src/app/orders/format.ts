/** Русская плюрализация: plural(2, 'зуб', 'зуба', 'зубов') → 'зуба'. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;

  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;

  return many;
}

const SHORT_DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const LONG_DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const DATE_TIME = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** «12 сент.» */
export function shortDate(iso: string): string {
  if (!iso) return 'не указан';
  return SHORT_DATE.format(new Date(iso));
}

/** «12 сентября» */
export function longDate(iso: string): string {
  if (!iso) return 'Не указан';
  return LONG_DATE.format(new Date(iso));
}

/** «5 сент., 10:12» */
export function dateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso)).replace(' в ', ', ');
}

/** Целых суток до срока; отрицательное — просрочено. */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const due = startOfDay(new Date(iso));
  const today = startOfDay(from);

  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** «(1 день)» / «(завтра)» — приписка к сроку, когда он поджимает. */
export function dueSuffix(iso: string, from: Date = new Date()): string {
  const days = daysUntil(iso, from);

  if (days < 0) return `(просрочен на ${-days} ${plural(-days, 'день', 'дня', 'дней')})`;
  if (days === 0) return '(сегодня)';
  if (days > 3) return '';

  return `(${days} ${plural(days, 'день', 'дня', 'дней')})`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
