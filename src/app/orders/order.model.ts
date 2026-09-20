/** Роль пользователя. Пока бэкенд её не назначил, в сессии лежит `null`. */
export type Role = 'doctor' | 'technician';

/** Статусная модель заказа из макета (frame 8:5). */
export type OrderStatus = 'sent' | 'accepted' | 'in_progress' | 'ready' | 'delivered';

export const ORDER_FLOW: readonly OrderStatus[] = [
  'sent',
  'accepted',
  'in_progress',
  'ready',
  'delivered',
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  sent: 'Отправлено',
  accepted: 'Принято',
  in_progress: 'В процессе',
  ready: 'Готово',
  delivered: 'Доставлено',
};

/** Кто выставляет статус — определяет, чьи кнопки активны. */
export const ORDER_STATUS_OWNER: Record<OrderStatus, Role> = {
  sent: 'doctor',
  accepted: 'technician',
  in_progress: 'technician',
  ready: 'technician',
  delivered: 'doctor',
};

export interface Person {
  id: string;
  role: Role;
  /** Полное имя: «Рустам Ахметов». */
  name: string;
  /** Короткое имя для карточек: «Р. Ахметов». */
  shortName: string;
  /** Организация: «Лаборатория «ОртоЛаб»» / «Клиника «Дента-М»». */
  org: string;
  /** Короткое имя организации для карточки техника: «ОртоЛаб». */
  orgShort: string;
  /** Username в Telegram — для перехода в личный чат. */
  telegram: string;
}

export type FileKind = 'stl' | 'image' | 'other';

export interface OrderFile {
  id: string;
  name: string;
  kind: FileKind;
}

export interface OrderEvent {
  status: OrderStatus;
  /** ISO-время смены статуса. */
  at: string;
}

export interface Order {
  id: string;
  /** «Иванов Артём П.» */
  patientName: string;
  /** «Иванов А. П.» */
  patientShort: string;
  teeth: number[];
  workType: string;
  /** «Коронка МК, 2 ед.» */
  workSummary: string;
  shade: string;
  /** ISO-дата срока сдачи. */
  dueDate: string;
  comment: string;
  files: OrderFile[];
  /** Участники приходят внутри заказа: отдельного справочника людей у API нет. */
  doctor: Person;
  technician: Person;
  status: OrderStatus;
  history: OrderEvent[];
  /** Непрочитанные уведомления от бота по этому заказу. */
  unread: number;
}

export function statusIndex(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}

/** Следующий статус в цепочке или `null`, если заказ закрыт. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  return ORDER_FLOW[statusIndex(status) + 1] ?? null;
}
