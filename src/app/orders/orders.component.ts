import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrderCardComponent } from './order-card/order-card.component';
import { OrdersService } from './orders.service';

type OrdersFilter = 'all' | 'active' | 'ready';

@Component({
  selector: 'app-orders',
  imports: [OrderCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './orders.component.scss',
  templateUrl: './orders.component.html',
})
export class OrdersComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);

  protected readonly clinicName = 'Клиника «Дента-М»';

  protected readonly filters: { value: OrdersFilter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'active', label: 'В работе' },
    { value: 'ready', label: 'Готово' },
  ];

  private readonly orders = this.ordersService.orders;
  protected readonly activeFilter = signal<OrdersFilter>('all');

  protected readonly filteredOrders = computed(() => {
    const filter = this.activeFilter();
    const orders = this.orders();

    if (filter === 'active') return orders.filter((order) => order.status !== 'ready');
    if (filter === 'ready') return orders.filter((order) => order.status === 'ready');

    return orders;
  });

  setFilter(filter: OrdersFilter): void {
    this.activeFilter.set(filter);
  }

  createOrder(): void {
    this.router.navigate(['/new-order']);
  }
}
