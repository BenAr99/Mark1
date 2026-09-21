import { HttpClient } from '@angular/common/http';
import { effect, inject, Service, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE, describeHttpError } from '../core/api';
import { AuthService } from '../core/auth.service';
import {
  parseOrder,
  parseOrderFile,
  parseOrderList,
  parsePeople,
  PersonOption,
} from './order.mapper';
import { FileKind, Order, OrderFile, OrderStatus, nextStatus, statusIndex } from './order.model';
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
  files: readonly { name: string; kind: FileKind; source: File }[];
}

export interface CreateOrderResult {
  order: Order;
  failedFiles: readonly string[];
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
  /** Инвалидирует ответы, начатые до смены роли. */
  private generation = 0;

  private readonly auth = inject(AuthService);

  constructor() {
    let previousRole = this.auth.role();

    // Роль сменилась (выбрали или сбросили) — загруженное к новой не относится.
    effect(() => {
      const role = this.auth.role();
      if (role === previousRole) return;

      previousRole = role;
      untracked(() => {
        this.reset();

        // Компонент новой роли мог успеть запустить GET /orders до этого effect.
        // reset() намеренно инвалидирует такой запрос, поэтому сразу запускаем
        // свежий уже с новым токеном и не оставляем экран пустым до перезагрузки.
        if (role) void this.loadOrders();
      });
    });
  }

  /** Чистит кеш: всё, что было загружено, относилось к прошлой роли. */
  reset(): void {
    this.generation += 1;
    this.inFlight = null;
    this._orders.set([]);
    this._technicians.set([]);
    this._techniciansError.set('');
    this._error.set('');
    this._state.set('idle');
  }

  /** Список заказов. Параллельные вызовы (два экрана сразу) ждут один запрос. */
  loadOrders(): Promise<void> {
    if (this.inFlight) return this.inFlight;

    const generation = this.generation;
    const request = this.fetchOrders(generation).finally(() => {
      // Старый запрос не должен затереть ссылку на новый, запущенный после reset().
      if (this.inFlight === request) this.inFlight = null;
    });

    this.inFlight = request;

    return request;
  }

  private async fetchOrders(generation: number): Promise<void> {
    this._state.set('loading');

    try {
      const orders = parseOrderList(await this.get('/orders'));
      if (generation !== this.generation) return;

      this._orders.set(orders);
      this._error.set('');
      this._state.set('ready');
    } catch (error) {
      if (generation !== this.generation) return;

      this._error.set(describeHttpError(error));
      this._state.set('error');
    }
  }

  /**
   * Карточка по прямой ссылке: список мог не загрузиться (перезапуск мини-аппа),
   * поэтому заказ всегда дотягиваем отдельным запросом и кладём в тот же кеш.
   */
  async loadOrder(id: string): Promise<void> {
    const generation = this.generation;
    if (this._state() === 'idle') this._state.set('loading');

    try {
      const order = parseOrder(await this.get(`/orders/${id}`), `GET /orders/${id}`);
      if (generation !== this.generation) return;

      this.upsert(order);
      this._error.set('');
      this._state.set('ready');
    } catch (error) {
      if (generation !== this.generation) return;

      this._error.set(describeHttpError(error));
      this._state.set('error');
    }
  }

  async loadTechnicians(): Promise<void> {
    const generation = this.generation;

    try {
      const technicians = parsePeople(
        await this.get('/technicians'),
        'technician',
        'GET /technicians',
      );
      if (generation !== this.generation) return;

      this._technicians.set(technicians);
      this._techniciansError.set('');
    } catch (error) {
      if (generation !== this.generation) return;

      // Без списка исполнителей заказ не отправить — причину показываем в форме.
      this._techniciansError.set(describeHttpError(error));
    }
  }

  byId(id: string): Order | undefined {
    return this._orders().find((order) => order.id === id);
  }

  /** Создаёт заказ и возвращает его в том виде, в каком его завёл бэкенд. */
  async create(draft: NewOrderInput): Promise<CreateOrderResult> {
    let created = parseOrder(
      await firstValueFrom(
        this.http.post<unknown>(`${API_BASE}/orders`, {
          patientName: draft.patientName.trim(),
          teeth: sortTeeth([...draft.teeth]),
          workType: draft.workType,
          dueDate: draft.dueDate || null,
          shade: draft.shade,
          comment: draft.comment.trim(),
          technicianId: Number(draft.technicianId),
          files: draft.files.map((file) => ({ name: file.name, kind: file.kind })),
        }),
      ),
      'POST /orders',
    );

    this.upsert(created);

    const failedFiles: string[] = [];
    const uploadedFiles = [...created.files];

    for (const [index, pending] of draft.files.entries()) {
      const metadata = created.files[index];
      if (!metadata) {
        failedFiles.push(pending.name);
        continue;
      }

      try {
        uploadedFiles[index] = await this.uploadFile(created.id, metadata.id, pending.source);
      } catch {
        failedFiles.push(pending.name);
      }
    }

    created = { ...created, files: uploadedFiles };
    this.upsert(created);

    return { order: created, failedFiles };
  }

  /** Загружает байты в уже созданную на бэкенде запись файла. */
  private async uploadFile(orderId: string, fileId: string, source: File): Promise<OrderFile> {
    const response = await firstValueFrom(
      this.http.put<unknown>(`${API_BASE}/orders/${orderId}/files/${fileId}`, source, {
        headers: { 'Content-Type': source.type || 'application/octet-stream' },
      }),
    );

    return parseOrderFile(response, `PUT /orders/${orderId}/files/${fileId}`);
  }

  /** Скачивает защищённое вложение и передаёт его браузеру. */
  async downloadFile(orderId: string, file: OrderFile): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${API_BASE}/orders/${orderId}/files/${file.id}/download`, {
        responseType: 'blob',
      }),
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = file.name;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
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

    await Promise.all(ids.map((id) => this.setStatus(id, 'accepted')));

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
