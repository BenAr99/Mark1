export {};

declare global {
  interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  }

  interface TelegramMainButton {
    setText(text: string): TelegramMainButton;
    setParams(params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }): TelegramMainButton;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  }

  interface TelegramSafeAreaInset {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }

  interface TelegramWebApp {
    ready(): void;
    expand(): void;
    close(): void;
    initData: string;
    initDataUnsafe: { user?: TelegramUser; auth_date?: number; hash?: string };
    /** 'ios' | 'android' | 'tdesktop' | 'weba' | … и 'unknown' вне Telegram. */
    platform: string;
    version: string;
    colorScheme: 'light' | 'dark';
    /** Видимая высота webview: viewportHeight «прыгает» во время анимаций, stable — нет. */
    viewportHeight: number;
    viewportStableHeight: number;
    isExpanded: boolean;
    /** Bot API 8.0 и новее — в старых клиентах свойств и метода просто нет. */
    safeAreaInset?: TelegramSafeAreaInset;
    contentSafeAreaInset?: TelegramSafeAreaInset;
    /** Bot API 7.7: отключает жест «свернуть», чтобы работала прокрутка. */
    disableVerticalSwipes?(): void;
    setHeaderColor(color: string): void;
    onEvent(event: string, cb: () => void): void;
    offEvent(event: string, cb: () => void): void;
    showAlert(message: string, cb?: () => void): void;
    showConfirm(message: string, cb: (confirmed: boolean) => void): void;
    openLink(url: string, options?: { try_instant_view?: boolean }): void;
    openTelegramLink(url: string): void;
    MainButton: TelegramMainButton;
    BackButton: {
      show(): void;
      hide(): void;
      onClick(cb: () => void): void;
      offClick(cb: () => void): void;
    };
    HapticFeedback: {
      impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
      notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    };
  }

  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
