import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { TelegramService } from '../../core/telegram.service';
import { OrderCardComponent } from '../../orders/order-card/order-card.component';
import { Order } from '../../orders/order.model';
import { OrdersService } from '../../orders/orders.service';
import { MainButtonComponent } from '../../shared/main-button/main-button.component';
import { SegmentedComponent, SegmentedItem } from '../../shared/segmented/segmented.component';
import { TgHeaderComponent } from '../../shared/tg-header/tg-header.component';

type TechFilter = 'new' | 'active' | 'done';

/** 06 · Техник — Входящие (frame 7:2). */
@Component({
  selector: 'app-tech-orders',
  imports: [TgHeaderComponent, SegmentedComponent, OrderCardComponent, MainButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tech-orders.component.scss',
  templateUrl: './tech-orders.component.html',
})
export class TechOrdersComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly telegram = inject(TelegramService);
  private readonly session = inject(SessionService);

  protected readonly subtitle = computed(() =>
    [this.session.orgShort(), this.session.displayName()].filter(Boolean).join(' · '),
  );

  protected readonly state = this.ordersService.state;
  protected readonly loadError = this.ordersService.error;

  /** `GET /orders` уже отдаёт только заказы, назначенные этому технику. */
  private readonly orders = this.ordersService.orders;

  private readonly newOrders = computed(() =>
    this.orders().filter((order) => order.status === 'sent'),
  );

  private readonly activeOrders = computed(() =>
    this.orders().filter((order) => order.status === 'accepted' || order.status === 'in_progress'),
  );

  private readonly doneOrders = computed(() =>
    this.orders().filter((order) => order.status === 'ready' || order.status === 'delivered'),
  );

  protected readonly filters = computed<readonly SegmentedItem<TechFilter>[]>(() => [
    { value: 'new', label: 'Новые', count: this.newOrders().length },
    { value: 'active', label: 'В работе', count: this.activeOrders().length },
    { value: 'done', label: 'Готовые', count: this.doneOrders().length },
  ]);

  /** Открываем на первой непустой вкладке: «Новые» → «В работе» → «Готовые». */
  protected readonly filter = linkedSignal<TechFilter>(() => {
    if (this.newOrders().length) return 'new';

    return this.activeOrders().length ? 'active' : 'done';
  });

  protected readonly visibleOrders = computed(() => {
    switch (this.filter()) {
      case 'new':
        return this.newOrders();
      case 'active':
        return this.activeOrders();
      default:
        return this.doneOrders();
    }
  });

  protected readonly newCount = computed(() => this.newOrders().length);

  constructor() {
    void this.reload();
  }

  protected reload(): Promise<void> {
    return this.ordersService.loadOrders();
  }

  protected openOrder(order: Order): void {
    this.router.navigate(['/tech/orders', order.id]);
  }

  protected async accept(order: Order): Promise<void> {
    try {
      await this.ordersService.setStatus(order.id, 'accepted');
      this.telegram.notify('success');
    } catch {
      this.telegram.notify('error');
    }
  }

  protected async acceptAll(): Promise<void> {
    try {
      if (await this.ordersService.acceptAllNew()) this.telegram.notify('success');
    } catch {
      this.telegram.notify('error');
    }
  }
}
