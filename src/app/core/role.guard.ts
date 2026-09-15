import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../orders/order.model';
import { SessionService } from './session.service';

/** Пускает на ветку маршрутов только ту роль, которую выдал бэкенд. */
export function roleGuard(role: Role): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);

    if (session.role() === role) return true;

    return router.parseUrl(session.role() ? session.homeRoute() : '/auth');
  };
}
