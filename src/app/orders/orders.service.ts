import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE, describeHttpError } from '../core/api';
import { parseOrder, parseOrderList, parsePeople, PersonOption } from './order.mapper';
import {
  FileKind,
  Order,
  OrderStatus,
  ORDER_STATUS_LABEL,
  nextStatus,
  statusIndex,
} from './order.model';
import { sortTeeth } from './teeth';

/** Справочники формы: фиксированные номенклатуры, у API отдельной ручки для них нет. */
export const WORK_TYPES: readonly string[] = [
  'Коронка МК',
  'Коронка Цирконий',
  'Винир E-max',
  'Бюгельный протез',
  'Съёмный протез',
  'Мостовидный протез',
];

/** Шкала Vita. */
export const SHADES: readonly string[] = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2'];

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Тело `POST /orders`. Черновик формы подходит под него структурно. */
export interface NewOrderInput {
  patientName: string;
  teeth: readonly number[];
  teethWork: string;
  workType: string;
  dueDate: string;
  shade: string;
  comment: string;
  technicianId: string | null;
  files: readonly { name: string; kind: FileKind }[];
}

@Service()
export class OrdersService {
  private readonly http = inject(HttpClient);

  /** `GET /orders` уже отдаёт только свои заказы — фильтровать по роли на клиенте нечего. */
  private readonly _orders = signal<readonly Order[]>([]);
  readonly orders = this._orders.asReadonly();

  private readonly _state = signal<LoadState>('idle');
  readonly state = this._state.asReadonly();

  private readonly _error = signal('');
  readonly error = this._error.asReadonly();

  private readonly _technicians = signal<readonly PersonOption[]>([]);
  readonly technicians = this._technicians.asReadonly();

  private readonly _techniciansError = signal('');
  readonly techniciansError = this._techniciansError.asReadonly();

  private inFlight: Promise<void> | null = null;

  /** Список заказов. Параллельные вызовы (два экрана сразу) ждут один запрос. */
  loadOrders(): Promise<void> {
    return (this.inFlight ??= this.fetchOrders().finally(() => {
      this.inFlight = null;
    }));
  }

  private async fetchOrders(): Promise<void> {
    this._state.set('loading');

    try {
      this._orders.set(parseOrderList(await this.get('/orders')));
      this._error.set('');
      this._state.set('ready');
    } catch (error) {
      this._error.set(describeHttpError(error));
      this._state.set('error');
    }
  }

  /**
   * Карточка по прямой ссылке: список мог не загрузиться (перезапуск мини-аппа),
   * поэтому заказ всегда дотягиваем отдельным запросом и кладём в тот же кеш.
   */
  async loadOrder(id: string): Promise<void> {
    if (this._state() === 'idle') this._state.set('loading');

    try {
      this.upsert(parseOrder(await this.get(`/orders/${id}`), `GET /orders/${id}`));
      this._error.set('');
      this._state.set('ready');
    } catch (error) {
      this._error.set(describeHttpError(error));
      this._state.set('error');
    }
  }

  async loadTechnicians(): Promise<void> {
    try {
      this._technicians.set(
        parsePeople(await this.get('/technicians'), 'technician', 'GET /technicians'),
      );
      this._techniciansError.set('');
    } catch (error) {
      // Без списка исполнителей заказ не отправить — причину показываем в форме.
      this._techniciansError.set(describeHttpError(error));
    }
  }

  byId(id: string): Order | undefined {
    return this._orders().find((order) => order.id === id);
  }

  /** Создаёт заказ и возвращает его в том виде, в каком его завёл бэкенд. */
  async create(draft: NewOrderInput): Promise<Order> {
    const created = parseOrder(
      await firstValueFrom(
        this.http.post<unknown>(`${API_BASE}/orders`, {
          patientName: draft.patientName.trim(),
          teeth: sortTeeth([...draft.teeth]),
          teethWork: draft.teethWork,
          workType: draft.workType,
          dueDate: draft.dueDate,
          shade: draft.shade,
          comment: draft.comment.trim(),
          technicianId: draft.technicianId,
          // Содержимое вложений пока не загружаем — отправляем только имена.
          files: draft.files.map((file) => ({ name: file.name, kind: file.kind })),
        }),
      ),
      'POST /orders',
    );

    this.upsert(created);

    return created;
  }

  /** Переводит заказ вперёд по цепочке. Назад не двигаем — это решает бэкенд. */
  async setStatus(id: string, status: OrderStatus): Promise<void> {
    const order = this.byId(id);
    if (order && statusIndex(status) <= statusIndex(order.status)) return;

    this.upsert(
      parseOrder(
        await firstValueFrom(
          this.http.post<unknown>(`${API_BASE}/orders/${id}/status`, { status }),
        ),
        `POST /orders/${id}/status`,
      ),
    );
  }

  /** Двигает заказ на один шаг вперёд по статусной модели. */
  async advance(id: string): Promise<OrderStatus | null> {
    const order = this.byId(id);
    const next = order ? nextStatus(order.status) : null;
    if (next) await this.setStatus(id, next);

    return next;
  }

  /** Техник принимает все новые заказы разом: массовой ручки у API нет. */
  async acceptAllNew(): Promise<number> {
    const ids = this._orders()
      .filter((order) => order.status === 'sent')
      .map((order) => order.id);

    for (const id of ids) await this.setStatus(id, 'accepted');

    return ids.length;
  }

  async markRead(id: string): Promise<void> {
    // Бейдж гасим сразу: ответа ждать незачем, а эффект вызывается на каждый показ.
    this._orders.update((orders) =>
      orders.map((order) => (order.id === id ? { ...order, unread: 0 } : order)),
    );

    try {
      await firstValueFrom(this.http.post<unknown>(`${API_BASE}/orders/${id}/read`, {}));
    } catch {
      // Отметка о прочтении — не то, ради чего стоит показывать ошибку.
    }
  }

  /** Текст уведомления, которое бот отправит второй стороне. */
  notificationText(order: Order, status: OrderStatus): string {
    return `Заказ №${order.id} · ${order.patientShort} — статус изменён: ${ORDER_STATUS_LABEL[status]}.`;
  }

  private get(path: string): Promise<unknown> {
    return firstValueFrom(this.http.get<unknown>(`${API_BASE}${path}`));
  }

  private upsert(order: Order): void {
    this._orders.update((orders) =>
      orders.some((candidate) => candidate.id === order.id)
        ? orders.map((candidate) => (candidate.id === order.id ? order : candidate))
        : [order, ...orders],
    );
  }
}
