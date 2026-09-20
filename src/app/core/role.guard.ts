import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../orders/order.model';
import { SessionService } from './session.service';

/**
 * Пускает на ветку маршрутов только ту роль, которую выдал бэкенд.
 * Аккаунт без роли уходит выбирать её, неавторизованный — на экран логина.
 */
export function roleGuard(role: Role): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);

    if (session.role() === role) return true;

    return router.parseUrl(session.isAuthorized() ? session.homeRoute() : '/auth');
  };
}

/** Выбор роли нужен один раз: с готовой ролью на этом экране делать нечего. */
export const noRoleGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.needsRole()) return true;

  return router.parseUrl(session.isAuthorized() ? session.homeRoute() : '/auth');
};

/** Общие экраны, доступные врачу и технику после выбора роли. */
export const authorizedGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.isAuthorized() && session.role() !== null) return true;

  return router.parseUrl(session.isAuthorized() ? '/role' : '/auth');
};
