import { computed, inject, Service } from '@angular/core';
import { Role } from '../orders/order.model';
import { AuthService } from './auth.service';
import { TelegramService } from './telegram.service';

/**
 * Кто сейчас в мини-аппе. Всё берётся из ответа `POST /auth/telegram`.
 * Роль у нового аккаунта пустая: он выбирает её сам на `/role`, после чего
 * `POST /me/role` закрепляет выбор за аккаунтом на бэкенде.
 */
@Service()
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly telegram = inject(TelegramService);

  readonly role = this.auth.role;
  readonly userId = this.auth.userId;
  readonly isAuthorized = computed(() => this.auth.accessToken() !== null);

  /** Вошли, но роли ещё нет — единственный, кому нужен экран выбора. */
  readonly needsRole = computed(() => this.isAuthorized() && this.role() === null);

  /** Профиль из ответа логина — бэкенд шлёт его не обязательно. */
  readonly person = this.auth.profile;

  /** Пока профиля нет, подписи экранов берём из initData Telegram. */
  readonly displayName = computed(() => {
    const person = this.person();
    if (person) return person.name;

    const user = this.telegram.user();

    return user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';
  });

  readonly org = computed(() => this.person()?.org ?? '');
  readonly orgShort = computed(() => this.person()?.orgShort ?? '');

  /** Куда идти после логина: без роли — на её выбор. */
  readonly homeRoute = computed(() => {
    switch (this.role()) {
      case 'technician':
        return '/tech';
      case 'doctor':
        return '/doctor';
      default:
        return '/role';
    }
  });

  setRole(role: Role): Promise<void> {
    return this.auth.setRole(role);
  }

  /** Снять роль: аккаунт снова окажется на экране выбора. */
  resetRole(): Promise<void> {
    return this.auth.setRole(null);
  }
}
