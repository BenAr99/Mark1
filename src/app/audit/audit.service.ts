import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE, describeHttpError } from '../core/api';
import { AuditEntry } from './audit.model';

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

  async load(orderId?: string): Promise<void> {
    const request = ++this.requestNumber;
    const normalizedId = orderId?.trim() ?? '';
    const path = normalizedId
      ? `/orders/${encodeURIComponent(normalizedId)}/audit-log`
      : '/audit-log';

    this._state.set('loading');
    this._error.set('');

    try {
      const entries = await firstValueFrom(this.http.get<AuditEntry[]>(`${API_BASE}${path}`));
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
}
