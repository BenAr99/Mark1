import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Person, Role } from '../orders/order.model';
import { parsePerson } from '../orders/order.mapper';
import { API_BASE, describeHttpError, field, isRecord, isUnauthorized } from './api';
import { TelegramService } from './telegram.service';

const STORAGE_KEY = 'dentalflow.session';

/** Разобранный ответ `POST /auth/telegram`. */
export interface AuthSession {
  accessToken: string;
  role: Role;
  /** Бэкенд фильтрует `/orders` сам по токену — id нужен только экранам. */
  userId: string | null;
  /** Профиль приходит не всегда: заголовки экранов переживают его отсутствие. */
  profile: Person | null;
}

export type AuthState =
  /** Вне Telegram отправлять нечего — запрос даже не уходит. */
  | { status: 'skipped' }
  | { status: 'pending' }
  | { status: 'ok' }
  /**
   * 401: бэкенд не принял initData — чаще всего `auth_date` старше суток.
   * Не фатально: Telegram выдаёт свежую строку при новом открытии мини-аппа.
   */
  | { status: 'expired'; detail: string }
  | { status: 'error'; message: string };

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly telegram = inject(TelegramService);

  /** Сессия переживает перезагрузку: мини-апп открывается сразу на своих данных. */
  private readonly _session = signal<AuthSession | null>(restore());
  readonly session = this._session.asReadonly();

  readonly accessToken = computed(() => this._session()?.accessToken ?? null);
  readonly role = computed<Role | null>(() => this._session()?.role ?? null);
  readonly userId = computed(() => this._session()?.userId ?? null);
  readonly profile = computed(() => this._session()?.profile ?? null);

  private readonly _state = signal<AuthState>(
    this._session() ? { status: 'ok' } : { status: 'skipped' },
  );
  readonly state = this._state.asReadonly();

  /** Логин идёт по одному: параллельные вызовы ждут уже запущенный. */
  private inFlight: Promise<void> | null = null;

  constructor() {
    // Мини-апп вернулся на передний план — единственный момент, когда Telegram
    // мог подменить initData на свежую. Пробуем ещё раз, но только если ждём этого.
    this.telegram.onActivated(() => {
      if (this._state().status === 'expired') void this.signInWithTelegram();
    });
  }

  /**
   * Логин мини-аппа: сырую строку initData проверяет бэкенд — подпись считается
   * секретом бота, на клиенте её подтвердить нечем.
   */
  signInWithTelegram(): Promise<void> {
    return (this.inFlight ??= this.run().finally(() => {
      this.inFlight = null;
    }));
  }

  /** Перелогин ради нового токена: вернёт его или `null`, если не вышло. */
  async refreshToken(): Promise<string | null> {
    await this.signInWithTelegram();

    return this.accessToken();
  }

  /** Токен протух посреди работы — просим переоткрыть мини-апп. */
  markExpired(detail: string): void {
    this.store(null);
    this._state.set({ status: 'expired', detail });
  }

  private async run(): Promise<void> {
    let initData = this.telegram.initData;

    if (!initData) {
      this._state.set({ status: 'skipped' });

      return;
    }

    this._state.set({ status: 'pending' });

    for (let attempt = 0; ; attempt++) {
      try {
        this.store(parseSession(await this.post(initData)));
        this._state.set({ status: 'ok' });

        return;
      } catch (error) {
        if (!isUnauthorized(error)) {
          this._state.set({ status: 'error', message: describeHttpError(error) });

          return;
        }

        const fresh = this.telegram.initData;

        // Повтор имеет смысл только с другой строкой: на той же самой бэкенд
        // посчитает тот же `auth_date` и ответит тем же 401.
        if (attempt > 0 || !fresh || fresh === initData) {
          this.markExpired(describeHttpError(error));

          return;
        }

        initData = fresh;
      }
    }
  }

  private post(initData: string): Promise<unknown> {
    return firstValueFrom(this.http.post<unknown>(`${API_BASE}/auth/telegram`, { initData }));
  }

  private store(session: AuthSession | null): void {
    this._session.set(session);

    try {
      session
        ? localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        : localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Приватный режим — сессия просто не переживёт перезагрузку.
    }
  }
}

/** Чужой формат ответа лучше увидеть сразу, поэтому разбор строгий к обязательным полям. */
function parseSession(raw: unknown): AuthSession {
  if (!isRecord(raw)) throw new Error('POST /auth/telegram: ответ не объект');

  const accessToken = field(raw, 'accessToken');
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('POST /auth/telegram: нет поля «accessToken»');
  }

  const user = isRecord(field(raw, 'user'))
    ? (field(raw, 'user') as Record<string, unknown>)
    : null;
  const role = field(raw, 'role') ?? (user ? field(user, 'role') : undefined);

  if (role !== 'doctor' && role !== 'technician') {
    throw new Error(`POST /auth/telegram: неизвестная роль «${String(role)}»`);
  }

  const rawId = field(raw, 'userId') ?? (user ? field(user, 'id') : undefined);

  return {
    accessToken,
    role,
    userId: typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : null,
    profile: user ? parsePerson(user, role, 'POST /auth/telegram · user') : null,
  };
}

function restore(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? parseSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
