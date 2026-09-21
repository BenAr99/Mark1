import { OrderStatus, Role } from '../orders/order.model';

export type AuditAction =
  'created' | 'opened' | 'status_changed' | 'file_added' | 'file_uploaded' | 'file_deleted';

export interface AuditActor {
  id: string;
  name: string;
  shortName: string;
  org: string;
  orgShort: string;
  telegram: string;
  role: Role | null;
}

/** Одна запись общего журнала действий. */
export interface AuditEntry {
  id: string;
  orderId: string;
  action: AuditAction;
  actor: AuditActor;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  fileName: string | null;
  at: string;
}

/** Внутри фронтенда поля camelCase; в HTTP они переводятся в имена из OpenAPI. */
export interface AuditFilters {
  orderId?: string;
  actorId?: string;
  date?: string;
  patientName?: string;
}
