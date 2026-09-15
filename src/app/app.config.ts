import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { apiAuthInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';
import { TelegramService } from './core/telegram.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      inject(TelegramService).init();
      // Намеренно не возвращаем промис: экран рисуется сразу, результат логина
      // приезжает в сигнал `AuthService.state`, а до него держит `/auth`.
      void inject(AuthService).signInWithTelegram();
    }),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([apiAuthInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
