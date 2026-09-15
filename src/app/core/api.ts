import { HttpErrorResponse } from '@angular/common/http';

/** Туннель ngrok живёт до перезапуска и каждый раз новый — правим адрес только здесь. */
export const API_BASE = 'https://managing-carried-frostily.ngrok-free.dev';

/** Читаемое описание сбоя: уходит в баннеры и в отладочный экран. */
export function describeHttpError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return String(error);

  // status 0 — до сервера не дошли: туннель закрыт, нет сети или не пустил CORS.
  if (error.status === 0) return 'нет ответа (туннель закрыт, нет сети или CORS)';

  const body = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);

  return `${error.status} ${error.statusText} · ${body}`;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Поле ответа без оглядки на стиль именования бэкенда: `patientName` и
 * `patient_name` читаются одинаково, чтобы контракт не ломался на мелочи.
 */
export function field(raw: Record<string, unknown>, name: string): unknown {
  const snake = name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  return raw[name] ?? raw[snake];
}

export function stringField(raw: Record<string, unknown>, name: string): string {
  const value = field(raw, name);

  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

export function requireString(raw: Record<string, unknown>, name: string, where: string): string {
  const value = stringField(raw, name);
  if (!value) throw new Error(`${where}: нет поля «${name}»`);

  return value;
}
