import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { OrderCardComponent } from './order-card/order-card.component';
import { Order } from './order.model';

type OrdersFilter = 'all' | 'active' | 'ready';

const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    patientName: 'Иванов А. П.',
    status: 'in_progress',
    teeth: [16, 17],
    workType: 'Металлокерамическая коронка, 2 ед.',
    dueDate: '12 сент.',
    assignee: 'Р. Ахметов',
    unreadCount: 2,
  },
  {
    id: '2',
    patientName: 'Петрова М. С.',
    status: 'ready',
    teeth: [24],
    workType: 'Винир E-max',
    dueDate: '9 сент.',
    assignee: 'Р. Ахметов',
  },
  {
    id: '3',
    patientName: 'Соколов Д. В.',
    status: 'accepted',
    teeth: [36, 37, 38],
    workType: 'Бюгельный протез',
    dueDate: '18 сент.',
    assignee: 'А. Гизатуллин',
  },
  {
    id: '4',
    patientName: 'Кузнецова Е. А.',
    status: 'sent',
    teeth: [11, 21],
    workType: 'Цирконий, 2 ед.',
    dueDate: '21 сент.',
    assignee: 'Р. Ахметов',
    unreadCount: 1,
  },
];

@Component({
  selector: 'app-orders',
  imports: [OrderCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './orders.component.scss',
  templateUrl: './orders.component.html',
})
export class OrdersComponent {
  protected readonly clinicName = 'Клиника «Дента-М»';

  protected readonly filters: { value: OrdersFilter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'active', label: 'В работе' },
    { value: 'ready', label: 'Готово' },
  ];

  private readonly orders = signal<Order[]>(MOCK_ORDERS);
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
    // TODO: navigate to the new order flow
  }
}
