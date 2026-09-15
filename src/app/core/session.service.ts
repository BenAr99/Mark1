import { computed, inject, Service } from '@angular/core';
import { AuthService } from './auth.service';
import { TelegramService } from './telegram.service';

/**
 * Кто сейчас в мини-аппе. Всё берётся из ответа `POST /auth/telegram`:
 * роль решает бэкенд по связке Telegram-аккаунта с пользователем.
 *
 * У админа своих заказов нет — он выбирает человека на `/role` и дальше
 * работает от его лица, поэтому `role()` во время подмены равна его роли.
 */
@Service()
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly telegram = inject(TelegramService);

  readonly role = this.auth.role;
  readonly userId = this.auth.userId;
  readonly isAuthorized = computed(() => this.auth.accessToken() !== null);

  readonly isAdmin = this.auth.isAdmin;
  readonly isActing = this.auth.isActing;
  readonly actingAs = this.auth.actingAs;

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

  /** Админ без подмены попадает на выбор, остальные — сразу в свои заказы. */
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

  actAs(userId: string): Promise<void> {
    return this.auth.actAs(userId);
  }

  stopActing(): void {
    this.auth.stopActing();
  }
}
