import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WorkRole } from '../orders/order.model';
import { SessionService } from './session.service';

/**
 * Пускает на ветку маршрутов только ту роль, которую выдал бэкенд.
 * Админ проходит, когда вошёл от лица врача или техника, — иначе его
 * отправляет на выбор человека.
 */
export function roleGuard(role: WorkRole): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);

    if (session.role() === role) return true;

    return router.parseUrl(session.role() ? session.homeRoute() : '/auth');
  };
}

/** Выбор человека — только для админа. */
export const adminGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.isAdmin()) return true;

  return router.parseUrl(session.role() ? session.homeRoute() : '/auth');
};
