import { Service, signal } from '@angular/core';
import { Order } from './order.model';

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

@Service()
export class OrdersService {
  private readonly _orders = signal<Order[]>(MOCK_ORDERS);
  readonly orders = this._orders.asReadonly();

  addOrder(order: Order): void {
    this._orders.update((orders) => [order, ...orders]);
  }
}
