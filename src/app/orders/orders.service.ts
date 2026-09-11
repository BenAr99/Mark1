import { Service, signal } from '@angular/core';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_LABEL,
  Person,
  nextStatus,
  statusIndex,
} from './order.model';

export const PEOPLE: readonly Person[] = [
  {
    id: 'd1',
    role: 'doctor',
    name: 'Иса Кулиев',
    shortName: 'д-р Кулиев',
    org: 'Клиника «Дента-М»',
    orgShort: 'Дента-М',
    telegram: 'dr_kuliev',
  },
  {
    id: 't1',
    role: 'technician',
    name: 'Рустам Ахметов',
    shortName: 'Р. Ахметов',
    org: 'Лаборатория «ОртоЛаб»',
    orgShort: 'ОртоЛаб',
    telegram: 'rustam_ortholab',
  },
  {
    id: 't2',
    role: 'technician',
    name: 'Азат Гизатуллин',
    shortName: 'А. Гизатуллин',
    org: 'Лаборатория «Дентал Про»',
    orgShort: 'Дентал Про',
    telegram: 'azat_dentalpro',
  },
  {
    id: 't3',
    role: 'technician',
    name: 'Марат Юсупов',
    shortName: 'М. Юсупов',
    org: 'Лаборатория «ОртоЛаб»',
    orgShort: 'ОртоЛаб',
    telegram: 'marat_ortholab',
  },
];

export const WORK_TYPES: readonly string[] = [
  'Коронка МК',
  'Коронка Цирконий',
  'Винир E-max',
  'Бюгельный протез',
  'Съёмный протез',
  'Мостовидный протез',
];

export const SHADES: readonly string[] = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2'];

const MOCK_ORDERS: readonly Order[] = [
  {
    id: '1042',
    patientName: 'Иванов Артём П.',
    patientShort: 'Иванов А. П.',
    teeth: [16, 17],
    workType: 'Коронка МК',
    workSummary: 'Коронка МК, 2 ед.',
    shade: 'A2',
    dueDate: '2026-09-11',
    comment: 'Уступ 0.8 мм, контакт с 15 плотный. Прикус снят силиконом.',
    files: [
      { id: 'f1', name: 'scan_16.stl', kind: 'stl' },
      { id: 'f2', name: 'photo_1.jpg', kind: 'image' },
      { id: 'f3', name: 'photo_2.jpg', kind: 'image' },
    ],
    doctorId: 'd1',
    technicianId: 't1',
    status: 'in_progress',
    history: [
      { status: 'sent', at: '2026-09-05T10:12:00' },
      { status: 'accepted', at: '2026-09-05T11:40:00' },
      { status: 'in_progress', at: '2026-09-06T09:05:00' },
    ],
    unread: 2,
  },
  {
    id: '1039',
    patientName: 'Петрова Марина С.',
    patientShort: 'Петрова М. С.',
    teeth: [24],
    workType: 'Винир E-max',
    workSummary: 'Винир E-max',
    shade: 'A1',
    dueDate: '2026-09-09',
    comment: 'Минимальная препаровка, оттенок подобран по шкале Vita.',
    files: [{ id: 'f4', name: 'scan_24.stl', kind: 'stl' }],
    doctorId: 'd1',
    technicianId: 't1',
    status: 'ready',
    history: [
      { status: 'sent', at: '2026-09-02T09:30:00' },
      { status: 'accepted', at: '2026-09-02T12:05:00' },
      { status: 'in_progress', at: '2026-09-03T10:00:00' },
      { status: 'ready', at: '2026-09-08T16:20:00' },
    ],
    unread: 1,
  },
  {
    id: '1036',
    patientName: 'Соколов Дмитрий В.',
    patientShort: 'Соколов Д. В.',
    teeth: [36, 37, 38],
    workType: 'Бюгельный протез',
    workSummary: 'Бюгельный протез',
    shade: 'A3',
    dueDate: '2026-09-18',
    comment: 'Кламмеры на 34 и 44, каркас кобальт-хром.',
    files: [
      { id: 'f5', name: 'scan_low.stl', kind: 'stl' },
      { id: 'f6', name: 'bite.jpg', kind: 'image' },
    ],
    doctorId: 'd1',
    technicianId: 't2',
    status: 'accepted',
    history: [
      { status: 'sent', at: '2026-09-04T14:10:00' },
      { status: 'accepted', at: '2026-09-04T18:35:00' },
    ],
    unread: 0,
  },
  {
    id: '1044',
    patientName: 'Кузнецова Елена А.',
    patientShort: 'Кузнецова Е. А.',
    teeth: [11, 21],
    workType: 'Коронка Цирконий',
    workSummary: 'Цирконий, 2 ед.',
    shade: 'B1',
    dueDate: '2026-09-21',
    comment: 'Пациентка просит максимально светлый оттенок.',
    files: [{ id: 'f7', name: 'scan_11_21.stl', kind: 'stl' }],
    doctorId: 'd1',
    technicianId: 't1',
    status: 'sent',
    history: [{ status: 'sent', at: '2026-09-09T11:02:00' }],
    unread: 0,
  },
  {
    id: '1045',
    patientName: 'Морозов Игорь Л.',
    patientShort: 'Морозов И. Л.',
    teeth: [46],
    workType: 'Коронка Цирконий',
    workSummary: 'Цирконий, 1 ед.',
    shade: 'A3',
    dueDate: '2026-09-14',
    comment: '',
    files: [],
    doctorId: 'd1',
    technicianId: 't1',
    status: 'sent',
    history: [{ status: 'sent', at: '2026-09-10T08:47:00' }],
    unread: 0,
  },
];

@Service()
export class OrdersService {
  private readonly _orders = signal<readonly Order[]>(MOCK_ORDERS);
  readonly orders = this._orders.asReadonly();

  readonly technicians = PEOPLE.filter((person) => person.role === 'technician');

  person(id: string): Person {
    const person = PEOPLE.find((candidate) => candidate.id === id);
    if (!person) throw new Error(`Неизвестный участник: ${id}`);

    return person;
  }

  byId(id: string): Order | undefined {
    return this._orders().find((order) => order.id === id);
  }

  forDoctor(doctorId: string): readonly Order[] {
    return this._orders().filter((order) => order.doctorId === doctorId);
  }

  forTechnician(technicianId: string): readonly Order[] {
    return this._orders().filter((order) => order.technicianId === technicianId);
  }

  /** Сколько заказов у техника сейчас в работе — показывается при выборе исполнителя. */
  loadOf(technicianId: string): number {
    return this._orders().filter(
      (order) =>
        order.technicianId === technicianId &&
        order.status !== 'ready' &&
        order.status !== 'delivered',
    ).length;
  }

  add(order: Order): void {
    this._orders.update((orders) => [order, ...orders]);
  }

  /**
   * Переводит заказ в новый статус и дописывает событие в историю.
   * Назад по цепочке не двигаем — это дело бэкенда, которого пока нет.
   */
  setStatus(id: string, status: OrderStatus): void {
    this._orders.update((orders) =>
      orders.map((order) => {
        if (order.id !== id || statusIndex(status) <= statusIndex(order.status)) return order;

        return {
          ...order,
          status,
          history: [...order.history, { status, at: new Date().toISOString() }],
        };
      }),
    );
  }

  /** Двигает заказ на один шаг вперёд по статусной модели. */
  advance(id: string): OrderStatus | null {
    const order = this.byId(id);
    const next = order ? nextStatus(order.status) : null;
    if (next) this.setStatus(id, next);

    return next;
  }

  /** Техник принимает все новые заказы разом. */
  acceptAllNew(technicianId: string): number {
    const ids = this._orders()
      .filter((order) => order.technicianId === technicianId && order.status === 'sent')
      .map((order) => order.id);

    ids.forEach((id) => this.setStatus(id, 'accepted'));

    return ids.length;
  }

  markRead(id: string): void {
    this._orders.update((orders) =>
      orders.map((order) => (order.id === id ? { ...order, unread: 0 } : order)),
    );
  }

  /** Текст уведомления, которое бот отправит второй стороне. */
  notificationText(order: Order, status: OrderStatus): string {
    return `Заказ №${order.id} · ${order.patientShort} — статус изменён: ${ORDER_STATUS_LABEL[status]}.`;
  }
}
