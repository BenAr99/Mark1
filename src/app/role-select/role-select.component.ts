import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEMO_IDENTITIES, DemoIdentity, SessionService } from '../core/session.service';
import { TelegramService } from '../core/telegram.service';
import { OrdersService } from '../orders/orders.service';

interface RoleOption {
  identity: DemoIdentity;
  name: string;
  org: string;
  roleLabel: string;
  /** Сколько заказов увидит этот пользователь. */
  orders: number;
}

interface InitDataParam {
  key: string;
  value: string;
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
  private readonly telegram = inject(TelegramService);

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

  /* ---------- Временный блок отладки initData ---------- */

  /**
   * Смотрим на сырой `window.Telegram.WebApp`, а не на `TelegramService.tg`:
   * сервис отсекает запуск вне клиента, а здесь как раз важно это увидеть.
   */
  private readonly rawWebApp = window.Telegram?.WebApp;

  protected readonly initData = this.telegram.initData || (this.rawWebApp?.initData ?? '');

  protected readonly platform = this.rawWebApp?.platform ?? 'скрипт не загрузился';
  protected readonly version = this.rawWebApp?.version ?? '—';
  protected readonly launchedInTelegram = this.telegram.isTelegram;

  /** initData — это percent-encoded query string, читаемой её делает разбор по ключам. */
  protected readonly initDataParams: InitDataParam[] = [
    ...new URLSearchParams(this.initData).entries(),
  ].map(([key, value]) => ({ key, value }));

  protected readonly copyState = signal<'idle' | 'done' | 'fail'>('idle');

  protected async copyInitData(): Promise<void> {
    if (!this.initData) return;

    try {
      await navigator.clipboard.writeText(this.initData);
      this.copyState.set('done');
    } catch {
      this.copyState.set('fail');
    }
  }
}
