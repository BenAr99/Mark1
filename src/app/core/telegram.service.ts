import { Service, signal } from '@angular/core';

/**
 * telegram-web-app.js создаёт `window.Telegram.WebApp` всегда — даже на обычном сайте.
 * Настоящий запуск из Telegram отличает `platform`: вне клиента он остаётся 'unknown'.
 */
function resolveWebApp(): TelegramWebApp | undefined {
  const webApp = window.Telegram?.WebApp;

  return webApp && webApp.platform !== 'unknown' ? webApp : undefined;
}

@Service()
export class TelegramService {
  readonly tg = resolveWebApp();
  readonly isTelegram = !!this.tg;

  readonly user = signal<TelegramUser | undefined>(this.tg?.initDataUnsafe?.user);
  readonly colorScheme = signal<'light' | 'dark'>(this.tg?.colorScheme ?? 'light');

  get initData(): string {
    return this.tg?.initData ?? '';
  }

  init(): void {
    if (!this.tg) return;
    this.tg.ready();
    this.tg.expand();
    this.tg.setHeaderColor('bg_color');
    this.tg.onEvent('themeChanged', () => this.colorScheme.set(this.tg!.colorScheme));
  }

  haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
    this.tg?.HapticFeedback.impactOccurred(style);
  }

  notify(type: 'error' | 'success' | 'warning'): void {
    this.tg?.HapticFeedback.notificationOccurred(type);
  }

  alert(message: string): void {
    this.tg ? this.tg.showAlert(message) : window.alert(message);
  }

  confirm(message: string): Promise<boolean> {
    if (!this.tg) return Promise.resolve(window.confirm(message));

    return new Promise((resolve) => this.tg!.showConfirm(message, resolve));
  }

  /** Вне Telegram закрывать нечего — оставляем вкладку как есть. */
  close(): void {
    this.tg?.close();
  }

  /**
   * Личная переписка вместо встроенного чата: бот шлёт уведомление в мини-апп,
   * а «написать» уводит в обычный диалог Telegram.
   */
  openChat(username: string): void {
    const url = `https://t.me/${username}`;
    this.tg ? this.tg.openTelegramLink(url) : window.open(url, '_blank', 'noopener');
  }
}
