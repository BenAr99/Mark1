import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {TelegramService} from './telegram.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(TelegramService).init()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
