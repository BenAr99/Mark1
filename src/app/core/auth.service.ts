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
  /** `null` — бэкенд ещё не знает, врач это или техник: роль выберет сам пользователь. */
  role: Role | null;
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

  /**
   * Закрепляет роль за аккаунтом; `null` снимает её и возвращает на экран выбора.
   * Если ответ принёс новый токен, берём его: прежний выдавался под старую роль.
   * Иначе перелогиниваемся, чтобы не гадать, помнит ли токен роль.
   */
  async setRole(role: Role | null): Promise<void> {
    const response = await firstValueFrom(this.http.post<unknown>(`${API_BASE}/me/role`, { role }));

    const session = tryParseSession(response, 'POST /me/role');

    session ? this.store(session) : await this.forceSignIn();
  }

  /** Перелогин ради свежего токена. */
  refreshToken(): Promise<void> {
    return this.signInWithTelegram();
  }

  /** Токен протух посреди работы — просим переоткрыть мини-апп. */
  markExpired(detail: string): void {
    this.store(null);
    this._state.set({ status: 'expired', detail });
  }

  /** Логин в обход дедупликации: нужен, когда сессия заведомо устарела. */
  private forceSignIn(): Promise<void> {
    this.inFlight = null;

    return this.signInWithTelegram();
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
        this.store(parseSession(await this.post(initData), 'POST /auth/telegram'));
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
function parseSession(raw: unknown, where: string): AuthSession {
  if (!isRecord(raw)) throw new Error(`${where}: ответ не объект`);

  const accessToken = field(raw, 'accessToken');
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error(`${where}: нет поля «accessToken»`);
  }

  const user = isRecord(field(raw, 'user'))
    ? (field(raw, 'user') as Record<string, unknown>)
    : null;
  const rawRole = field(raw, 'role') ?? (user ? field(user, 'role') : undefined);
  const rawId = field(raw, 'userId') ?? (user ? field(user, 'id') : undefined);

  // Пустая роль — не ошибка: так выглядит аккаунт, который её ещё не выбрал.
  if (rawRole !== undefined && rawRole !== null && !isRole(rawRole)) {
    throw new Error(`${where}: неизвестная роль «${String(rawRole)}»`);
  }

  const role = isRole(rawRole) ? rawRole : null;

  return {
    accessToken,
    role,
    userId: typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : null,
    profile: user && role ? parsePerson(user, role, `${where} · user`) : null,
  };
}

/** Тот же разбор для ответа, который сессией может и не быть. */
function tryParseSession(raw: unknown, where: string): AuthSession | null {
  try {
    return parseSession(raw, where);
  } catch {
    return null;
  }
}

function isRole(value: unknown): value is Role {
  return value === 'doctor' || value === 'technician';
}

function restore(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? parseSession(JSON.parse(raw), 'сохранённая сессия') : null;
  } catch {
    return null;
  }
}
