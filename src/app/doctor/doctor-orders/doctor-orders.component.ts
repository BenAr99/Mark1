import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { OrderCardComponent } from '../../orders/order-card/order-card.component';
import { Order } from '../../orders/order.model';
import { OrdersService } from '../../orders/orders.service';
import { MainButtonComponent } from '../../shared/main-button/main-button.component';
import { SegmentedComponent, SegmentedItem } from '../../shared/segmented/segmented.component';
import { TgHeaderComponent } from '../../shared/tg-header/tg-header.component';

type DoctorFilter = 'all' | 'active' | 'ready';

const FILTERS: readonly SegmentedItem<DoctorFilter>[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'В работе' },
  { value: 'ready', label: 'Готово' },
];

/** 01 · Врач — Мои заказы (frame 2:2). */
@Component({
  selector: 'app-doctor-orders',
  imports: [TgHeaderComponent, SegmentedComponent, OrderCardComponent, MainButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './doctor-orders.component.scss',
  templateUrl: './doctor-orders.component.html',
})
export class DoctorOrdersComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly session = inject(SessionService);

  protected readonly filters = FILTERS;
  protected readonly filter = signal<DoctorFilter>('all');

  protected readonly clinic = computed(() => this.session.org());

  protected readonly state = this.ordersService.state;
  protected readonly loadError = this.ordersService.error;

  /** `GET /orders` уже отдаёт только заказы этого врача. */
  private readonly orders = this.ordersService.orders;

  protected readonly visibleOrders = computed(() => {
    const orders = this.orders();

    switch (this.filter()) {
      case 'active':
        return orders.filter((order) => order.status !== 'ready' && order.status !== 'delivered');
      case 'ready':
        return orders.filter((order) => order.status === 'ready');
      default:
        return orders;
    }
  });

  constructor() {
    void this.reload();
  }

  protected reload(): Promise<void> {
    return this.ordersService.loadOrders();
  }

  protected openOrder(order: Order): void {
    this.router.navigate(['/doctor/orders', order.id]);
  }

  protected openAuditLog(): void {
    this.router.navigate(['/audit-log']);
  }

  protected createOrder(): void {
    this.router.navigate(['/doctor/new']);
  }
}
