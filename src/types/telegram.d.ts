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

  interface TelegramWebApp {
    ready(): void;
    expand(): void;
    close(): void;
    initData: string;
    initDataUnsafe: { user?: TelegramUser; auth_date?: number; hash?: string };
    colorScheme: 'light' | 'dark';
    setHeaderColor(color: string): void;
    onEvent(event: string, cb: () => void): void;
    offEvent(event: string, cb: () => void): void;
    showAlert(message: string, cb?: () => void): void;
    showConfirm(message: string, cb: (confirmed: boolean) => void): void;
    MainButton: {
      setText(text: string): TelegramWebApp['MainButton'];
      show(): void;
      hide(): void;
      showProgress(leaveActive?: boolean): void;
      hideProgress(): void;
      onClick(cb: () => void): void;
      offClick(cb: () => void): void;
    };
    BackButton: {
      show(): void;
      hide(): void;
      onClick(cb: () => void): void;
      offClick(cb: () => void): void;
    };
    HapticFeedback: { impactOccurred(style: 'light' | 'medium' | 'heavy'): void };
  }

  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
