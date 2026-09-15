import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { API_BASE } from '../api';
import { AuthService } from '../auth.service';
import { SessionService } from '../session.service';
import { TelegramService } from '../telegram.service';

interface InitDataParam {
  key: string;
  value: string;
}

/**
 * Экран-прихожая: держит пользователя, пока `POST /auth/telegram` не вернёт роль,
 * и показывает, что именно пошло не так. Диагностика initData здесь же — без неё
 * сбой логина выглядит как пустой белый экран.
 */
@Component({
  selector: 'app-auth-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './auth-gate.component.scss',
  templateUrl: './auth-gate.component.html',
})
export class AuthGateComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly telegram = inject(TelegramService);

  protected readonly authState = this.auth.state;
  protected readonly authUrl = `${API_BASE}/auth/telegram`;

  constructor() {
    // Роль приехала — дальше решает roleGuard, здесь задерживать незачем.
    effect(() => {
      if (this.session.role()) void this.router.navigateByUrl(this.session.homeRoute());
    });
  }

  protected retry(): void {
    void this.auth.signInWithTelegram();
  }

  /* ---------- Диагностика initData ---------- */

  /**
   * Смотрим на сырой `window.Telegram.WebApp`, а не на `TelegramService.tg`:
   * сервис отсекает запуск вне клиента, а здесь как раз важно это увидеть.
   */
  private readonly rawWebApp = window.Telegram?.WebApp;

  protected readonly initData = this.telegram.initData || (this.rawWebApp?.initData ?? '');

  protected readonly platform = this.rawWebApp?.platform ?? 'скрипт не загрузился';
  protected readonly version = this.rawWebApp?.version ?? '—';
  protected readonly launchedInTelegram = this.telegram.isTelegram;

  /** initData — это percent-encoded query string, читаемой её делает разбор по ключам. */
  protected readonly initDataParams: InitDataParam[] = [
    ...new URLSearchParams(this.initData).entries(),
  ].map(([key, value]) => ({ key, value }));

  protected readonly copyState = signal<'idle' | 'done' | 'fail'>('idle');

  protected readonly details = signal(false);

  protected readonly headline = computed(() => {
    switch (this.authState().status) {
      case 'pending':
        return 'Проверяем аккаунт…';
      case 'skipped':
        return 'Мини-апп открыт не из Telegram';
      case 'expired':
        return 'Сессия Telegram устарела';
      case 'error':
        return 'Не удалось войти';
      default:
        return 'Входим…';
    }
  });

  protected readonly hint = computed(() => {
    switch (this.authState().status) {
      case 'pending':
        return 'Бэкенд сверяет подпись initData.';
      case 'skipped':
        return 'Откройте приложение через бота — вход работает только внутри Telegram.';
      case 'expired':
        return 'Закройте и откройте мини-апп заново: Telegram выдаст свежую initData.';
      case 'error':
        return 'Проверьте, что бэкенд доступен, и попробуйте ещё раз.';
      default:
        return '';
    }
  });

  protected async copyInitData(): Promise<void> {
    if (!this.initData) return;

    try {
      await navigator.clipboard.writeText(this.initData);
      this.copyState.set('done');
    } catch {
      this.copyState.set('fail');
    }
  }
}
