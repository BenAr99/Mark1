import { Role } from '../orders/order.model';

export interface AuditActor {
  name: string;
  role: Role;
}

/** Одна запись общего журнала действий. */
export interface AuditEntry {
  id: string;
  action: string;
  orderId: string | null;
  actor: AuditActor | null;
  createdAt: string;
  description: string;
}
