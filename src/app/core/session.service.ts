import { computed, inject, Service, signal } from '@angular/core';
import { Person, Role } from '../orders/order.model';
import { OrdersService } from '../orders/orders.service';

const STORAGE_KEY = 'dentalflow.demo-identity';

/** Кем зайти в мини-апп, пока нет авторизации и бэкенда. */
export interface DemoIdentity {
  role: Role;
  personId: string;
}

export const DEMO_IDENTITIES: readonly DemoIdentity[] = [
  { role: 'doctor', personId: 'd1' },
  { role: 'technician', personId: 't1' },
  { role: 'technician', personId: 't2' },
];

@Service()
export class SessionService {
  private readonly orders = inject(OrdersService);

  private readonly _identity = signal<DemoIdentity | null>(restore());

  readonly identity = this._identity.asReadonly();
  readonly role = computed<Role | null>(() => this._identity()?.role ?? null);

  /** Текущий пользователь. Обращаться только после проверки `identity()`. */
  readonly person = computed<Person | null>(() => {
    const identity = this._identity();

    return identity ? this.orders.person(identity.personId) : null;
  });

  readonly homeRoute = computed(() => (this.role() === 'technician' ? '/tech' : '/doctor'));

  signIn(identity: DemoIdentity): void {
    this._identity.set(identity);
    persist(identity);
  }

  signOut(): void {
    this._identity.set(null);
    persist(null);
  }
}

function restore(): DemoIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DemoIdentity;

    return DEMO_IDENTITIES.some(
      (identity) => identity.role === parsed.role && identity.personId === parsed.personId,
    )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function persist(identity: DemoIdentity | null): void {
  try {
    identity
      ? localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
      : localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Приватный режим — роль просто не переживёт перезагрузку.
  }
}
