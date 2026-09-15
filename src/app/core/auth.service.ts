import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Person, Role, WorkRole } from '../orders/order.model';
import { parsePerson } from '../orders/order.mapper';
import { API_BASE, describeHttpError, field, isRecord, isUnauthorized } from './api';
import { TelegramService } from './telegram.service';

const STORAGE_KEY = 'dentalflow.session';

/** Разобранный ответ логина: и `/auth/telegram`, и `/admin/act-as/{id}`. */
export interface AuthSession {
  accessToken: string;
  role: Role;
  /** Бэкенд фильтрует `/orders` сам по токену — id нужен только экранам. */
  userId: string | null;
  /** Профиль приходит не всегда: заголовки экранов переживают его отсутствие. */
  profile: Person | null;
}

/**
 * Админ смотрит приложение от лица врача или техника, поэтому личностей две:
 * своя (по initData) и подменённая (по токену из `/admin/act-as`).
 */
interface StoredAuth {
  own: AuthSession | null;
  acting: { userId: string; session: AuthSession } | null;
}

const EMPTY: StoredAuth = { own: null, acting: null };

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
  private readonly _auth = signal<StoredAuth>(restore());

  /** Личность, от лица которой работает приложение. */
  private readonly active = computed(() => {
    const auth = this._auth();

    return auth.acting?.session ?? auth.own;
  });

  readonly accessToken = computed(() => this.active()?.accessToken ?? null);
  readonly role = computed<Role | null>(() => this.active()?.role ?? null);
  readonly userId = computed(() => this.active()?.userId ?? null);
  readonly profile = computed(() => this.active()?.profile ?? null);

  /** Собственный токен: им подписываются админские ручки даже во время подмены. */
  readonly ownToken = computed(() => this._auth().own?.accessToken ?? null);
  readonly isAdmin = computed(() => this._auth().own?.role === 'admin');
  readonly actingAs = computed(() => this._auth().acting?.session.profile ?? null);
  readonly isActing = computed(() => !!this._auth().acting);

  private readonly _state = signal<AuthState>(
    this._auth().own ? { status: 'ok' } : { status: 'skipped' },
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

  /** Админ входит от лица выбранного человека. */
  async actAs(userId: string): Promise<void> {
    const session = parseSession(
      await firstValueFrom(this.http.post<unknown>(`${API_BASE}/admin/act-as/${userId}`, {})),
      `POST /admin/act-as/${userId}`,
    );

    this.store({ own: this._auth().own, acting: { userId, session } });
  }

  /** Возврат к собственной админской личности. */
  stopActing(): void {
    this.store({ own: this._auth().own, acting: null });
  }

  /**
   * Перелогин ради свежих токенов. Подмену переоформляем следом: токен под
   * чужую личность выдан поверх админского и протухает вместе с ним.
   *
   * Личность при этом не меняется ни на миг — иначе кеш заказов счёл бы её
   * чужой и выбросил ответ запроса, ради которого мы и обновляли токен.
   */
  async refreshToken(): Promise<void> {
    const acting = this._auth().acting?.userId ?? null;

    await this.signInWithTelegram();

    if (!acting || !this._auth().own) return;

    try {
      await this.actAs(acting);
    } catch {
      // Подмена не переоформилась — возвращаемся в режим админа: дальше решит `/role`.
      this.stopActing();
    }
  }

  /** Токен протух посреди работы — просим переоткрыть мини-апп. */
  markExpired(detail: string): void {
    this.store(EMPTY);
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
        const own = parseSession(await this.post(initData), 'POST /auth/telegram');

        this.store({ own, acting: this._auth().acting });
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

  private store(auth: StoredAuth): void {
    // Подмена — привилегия админа: со сменой роли она теряет смысл.
    const next: StoredAuth = auth.own?.role === 'admin' ? auth : { own: auth.own, acting: null };

    this._auth.set(next);

    try {
      next.own
        ? localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
  const role = field(raw, 'role') ?? (user ? field(user, 'role') : undefined);

  if (role !== 'doctor' && role !== 'technician' && role !== 'admin') {
    throw new Error(`${where}: неизвестная роль «${String(role)}»`);
  }

  const rawId = field(raw, 'userId') ?? (user ? field(user, 'id') : undefined);
  const workRole: WorkRole | null = role === 'admin' ? null : role;

  return {
    accessToken,
    role,
    userId: typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : null,
    // У админа профиля врача или техника нет — карточку участника не собираем.
    profile: user && workRole ? parsePerson(user, workRole, `${where} · user`) : null,
  };
}

function restore(): StoredAuth {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;

    const parsed = JSON.parse(raw) as StoredAuth;
    const own = parsed.own ? parseSession(parsed.own, 'сохранённая сессия') : null;

    if (own?.role !== 'admin' || !parsed.acting) return { own, acting: null };

    return {
      own,
      acting: {
        userId: String(parsed.acting.userId),
        session: parseSession(parsed.acting.session, 'сохранённая подмена'),
      },
    };
  } catch {
    return EMPTY;
  }
}
