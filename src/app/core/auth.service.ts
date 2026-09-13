import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TelegramService } from './telegram.service';

/** Туннель ngrok живёт до перезапуска и каждый раз новый — правим адрес только здесь. */
export const API_BASE = 'https://managing-carried-frostily.ngrok-free.dev'

export type AuthState =
  /** Вне Telegram отправлять нечего — запрос даже не уходит. */
  | { status: 'skipped' }
  | { status: 'pending' }
  | { status: 'ok'; response: unknown }
  | { status: 'error'; message: string };

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly telegram = inject(TelegramService);

  private readonly _state = signal<AuthState>({ status: 'skipped' });
  readonly state = this._state.asReadonly();

  /**
   * Логин мини-аппа: сырую строку initData проверяет бэкенд — подпись считается
   * секретом бота, на клиенте её подтвердить нечем.
   */
  async signInWithTelegram(): Promise<void> {
    const initData = this.telegram.initData;

    if (!initData) {
      this._state.set({ status: 'skipped' });

      return;
    }

    this._state.set({ status: 'pending' });

    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(
          `${API_BASE}/auth/telegram`,
          { initData },
          // Без этого заголовка бесплатный ngrok отдаёт HTML-заглушку вместо ответа.
          { headers: { 'ngrok-skip-browser-warning': 'true' } },
        ),
      );

      this._state.set({ status: 'ok', response });
    } catch (error) {
      this._state.set({ status: 'error', message: describe(error) });
    }
  }
}

function describe(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return String(error);

  // status 0 — до сервера не дошли: туннель закрыт, нет сети или не пустил CORS.
  if (error.status === 0) return 'нет ответа (туннель закрыт, нет сети или CORS)';

  const body = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);

  return `${error.status} ${error.statusText} · ${body}`;
}
