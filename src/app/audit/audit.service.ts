import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE, describeHttpError } from '../core/api';
import { PersonOption } from '../orders/order.mapper';
import { AuditEntry, AuditFilters } from './audit.model';

export type AuditLoadState = 'idle' | 'loading' | 'ready' | 'error';

@Service()
export class AuditService {
  private readonly http = inject(HttpClient);
  private requestNumber = 0;

  private readonly _entries = signal<readonly AuditEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  private readonly _state = signal<AuditLoadState>('idle');
  readonly state = this._state.asReadonly();

  private readonly _error = signal('');
  readonly error = this._error.asReadonly();

  private readonly _actors = signal<readonly PersonOption[]>([]);
  readonly actors = this._actors.asReadonly();

  private readonly _actorsError = signal('');
  readonly actorsError = this._actorsError.asReadonly();

  async load(filters: AuditFilters = {}): Promise<void> {
    const request = ++this.requestNumber;
    let params = new HttpParams();

    if (filters.orderId) params = params.set('order_id', filters.orderId);
    if (filters.actorId) params = params.set('actor_id', filters.actorId);
    if (filters.date) params = params.set('date', filters.date);
    if (filters.patientName) params = params.set('patient_name', filters.patientName);

    this._state.set('loading');
    this._error.set('');

    try {
      const entries = await firstValueFrom(
        this.http.get<AuditEntry[]>(`${API_BASE}/audit-log`, { params }),
      );
      if (request !== this.requestNumber) return;

      this._entries.set(entries);
      this._state.set('ready');
    } catch (error) {
      if (request !== this.requestNumber) return;

      this._entries.set([]);
      this._error.set(describeHttpError(error));
      this._state.set('error');
    }
  }

  async loadActors(): Promise<void> {
    try {
      const [doctors, technicians] = await Promise.all([
        firstValueFrom(this.http.get<PersonOption[]>(`${API_BASE}/doctors`)),
        firstValueFrom(this.http.get<PersonOption[]>(`${API_BASE}/technicians`)),
      ]);

      this._actors.set(
        [...doctors, ...technicians].sort((left, right) =>
          left.name.localeCompare(right.name, 'ru'),
        ),
      );
      this._actorsError.set('');
    } catch (error) {
      this._actors.set([]);
      this._actorsError.set(describeHttpError(error));
    }
  }
}
