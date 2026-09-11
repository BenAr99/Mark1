import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { TelegramService } from './core/telegram.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(TelegramService).init()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
