export type OrderStatus = 'in_progress' | 'ready' | 'accepted' | 'sent';

export interface Order {
  id: string;
  patientName: string;
  status: OrderStatus;
  teeth: number[];
  workType: string;
  dueDate: string;
  assignee: string;
  unreadCount?: number;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  in_progress: 'В процессе',
  ready: 'Готово',
  accepted: 'Принято',
  sent: 'Отправлено',
};
