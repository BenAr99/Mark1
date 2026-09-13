import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth.service';
import { TelegramService } from './core/telegram.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      inject(TelegramService).init();
      // Намеренно не возвращаем промис: экран рисуется сразу, результат логина
      // приезжает в сигнал `AuthService.state`.
      void inject(AuthService).signInWithTelegram();
    }),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
