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
    this.keepFocusVisible();

    if (!this.tg) return;
    this.tg.ready();
    this.tg.expand();
    this.tg.setHeaderColor('bg_color');

    // Без этого Android принимает протяжку внутри списка за жест «свернуть мини-апп»:
    // страница дёргается и не прокручивается. Метод появился в Bot API 7.7.
    this.tg.disableVerticalSwipes?.();

    this.tg.onEvent('themeChanged', () => this.colorScheme.set(this.tg!.colorScheme));

    this.syncViewport();
    // Высота меняется при разворачивании, повороте и открытии клавиатуры;
    // safe area — при переходе в полноэкранный режим (Bot API 8.0).
    this.tg.onEvent('viewportChanged', () => this.syncViewport());
    this.tg.onEvent('safeAreaChanged', () => this.syncViewport());
    this.tg.onEvent('contentSafeAreaChanged', () => this.syncViewport());
    this.tg.onEvent('fullscreenChanged', () => this.syncViewport());
  }

  /**
   * Клавиатура перекрывает поле ввода: высота мини-аппа при её появлении не
   * меняется (`viewportStableHeight` на то и stable), поэтому браузеру нечего
   * прокручивать — подводим сфокусированное поле к центру сами.
   */
  private keepFocusVisible(): void {
    document.addEventListener('focusin', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('input, textarea')) return;

      // Ждём анимацию клавиатуры: до неё прокручивать некуда.
      setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
    });
  }

  /** 'activated' — мини-апп снова на переднем плане (Bot API 8.0). */
  onActivated(handler: () => void): void {
    this.tg?.onEvent('activated', handler);
  }

  /**
   * `100dvh` в мини-аппе врёт: webview выше видимой области, поэтому низ экрана
   * уезжает под клиент Telegram и до него не доскроллить. Реальные размеры знает
   * только сам Telegram — переносим их в CSS-переменные.
   */
  private syncViewport(): void {
    if (!this.tg) return;

    const root = document.documentElement.style;
    const height = this.tg.viewportStableHeight || this.tg.viewportHeight;

    if (height) root.setProperty('--tg-app-height', `${height}px`);

    // Отступы под системные элементы нужны только в полноэкранном режиме. В обычном
    // Telegram сам ставит webview ниже своей шапки, но `safeAreaInset` всё равно
    // сообщает вырез устройства — прибавив его, мы бы украли высоту у нижнего края
    // и последний экран стал бы недоступен.
    const fullscreen = this.tg.isFullscreen === true;
    const safe = this.tg.safeAreaInset;
    const content = this.tg.contentSafeAreaInset;

    const top = fullscreen ? (content?.top ?? safe?.top ?? 0) : 0;
    const bottom = fullscreen ? (content?.bottom ?? safe?.bottom ?? 0) : 0;

    root.setProperty('--tg-inset-top', `${top}px`);
    root.setProperty('--tg-inset-bottom', `${bottom}px`);
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
