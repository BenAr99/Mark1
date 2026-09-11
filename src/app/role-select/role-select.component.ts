import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DEMO_IDENTITIES, DemoIdentity, SessionService } from '../core/session.service';
import { OrdersService } from '../orders/orders.service';

interface RoleOption {
  identity: DemoIdentity;
  name: string;
  org: string;
  roleLabel: string;
  /** Сколько заказов увидит этот пользователь. */
  orders: number;
}

/**
 * Обёртка на время демо: авторизации и бэкенда ещё нет, поэтому
 * пользователя выбираем руками. Выбор запоминается в localStorage.
 */
@Component({
  selector: 'app-role-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './role-select.component.scss',
  templateUrl: './role-select.component.html',
})
export class RoleSelectComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly session = inject(SessionService);

  protected readonly current = this.session.identity;

  protected readonly options = computed<RoleOption[]>(() =>
    DEMO_IDENTITIES.map((identity) => {
      const person = this.ordersService.person(identity.personId);
      const orders =
        identity.role === 'doctor'
          ? this.ordersService.forDoctor(person.id)
          : this.ordersService.forTechnician(person.id);

      return {
        identity,
        name: person.name,
        org: person.org,
        roleLabel: identity.role === 'doctor' ? 'Врач' : 'Техник',
        orders: orders.length,
      };
    }),
  );

  protected isCurrent(identity: DemoIdentity): boolean {
    const current = this.current();

    return current?.role === identity.role && current?.personId === identity.personId;
  }

  protected signIn(identity: DemoIdentity): void {
    this.session.signIn(identity);
    this.router.navigateByUrl(this.session.homeRoute());
  }
}
