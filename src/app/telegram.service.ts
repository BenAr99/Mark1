import { Service, signal } from '@angular/core';

@Service()
export class TelegramService {
  readonly tg = window.Telegram?.WebApp;
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
    this.tg.setHeaderColor('secondary_bg_color');
    this.tg.onEvent('themeChanged', () => this.colorScheme.set(this.tg!.colorScheme));
  }

  haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
    this.tg?.HapticFeedback.impactOccurred(style);
  }

  alert(message: string): void {
    this.tg ? this.tg.showAlert(message) : window.alert(message);
  }
}
