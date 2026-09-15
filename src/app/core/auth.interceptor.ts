import { HttpContextToken, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE, describeHttpError, isUnauthorized } from './api';
import { AuthService } from './auth.service';

const AUTH_URL = `${API_BASE}/auth/telegram`;
const ADMIN_PREFIX = `${API_BASE}/admin/`;

/** Повторяем запрос после перелогина ровно один раз — иначе на 401 будет цикл. */
const RETRIED = new HttpContextToken(() => false);

/**
 * Подписывает запросы к API токеном из `AuthService`. Чужие адреса (шрифты,
 * telegram.org) не трогает — Bearer им не нужен и светить его там незачем.
 */
export const apiAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) return next(req);

  const auth = inject(AuthService);

  // Сам логин токеном не подписывается — он его и выдаёт.
  if (req.url === AUTH_URL) return next(withAuth(req, null));

  // Админские ручки — всегда от своего имени: во время подмены активен чужой токен,
  // и запрос «войти от лица другого» под ним бэкенд справедливо не пропустит.
  const admin = req.url.startsWith(ADMIN_PREFIX);
  const token = admin ? auth.ownToken() : auth.accessToken();

  return next(withAuth(req, token)).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error) || req.context.get(RETRIED)) return throwError(() => error);

      // Токен протух посреди работы: пробуем перелогиниться и повторить запрос.
      return from(auth.refreshToken()).pipe(
        switchMap(() => {
          const fresh = admin ? auth.ownToken() : auth.accessToken();

          if (!fresh || fresh === token) {
            auth.markExpired(describeHttpError(error));

            return throwError(() => error);
          }

          return next(withAuth(req.clone({ context: req.context.set(RETRIED, true) }), fresh));
        }),
      );
    }),
  );
};

function withAuth(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      // Без этого заголовка бесплатный ngrok отдаёт HTML-заглушку вместо ответа.
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
