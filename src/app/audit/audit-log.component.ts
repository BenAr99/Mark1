import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../core/session.service';
import { dateTime } from '../orders/format';
import { TgHeaderComponent } from '../shared/tg-header/tg-header.component';
import { AuditService } from './audit.service';

const ACTION_LABELS: Readonly<Record<string, string>> = {
  orderCreated: 'Заказ создан',
  orderUpdated: 'Заказ изменён',
  orderDeleted: 'Заказ удалён',
  orderStatusChanged: 'Статус заказа изменён',
  orderRead: 'Заказ просмотрен',
  roleChanged: 'Роль пользователя изменена',
};

@Component({
  selector: 'app-audit-log',
  imports: [TgHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './audit-log.component.scss',
  templateUrl: './audit-log.component.html',
})
export class AuditLogComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly session = inject(SessionService);
  private readonly audit = inject(AuditService);

  protected readonly state = this.audit.state;
  protected readonly entries = this.audit.entries;
  protected readonly loadError = this.audit.error;
  protected readonly activeOrderId = signal(this.route.snapshot.paramMap.get('orderId') ?? '');
  protected readonly subtitle = computed(() =>
    this.activeOrderId() ? `Заказ №${this.activeOrderId()}` : 'Все действия',
  );

  constructor() {
    void this.audit.load(this.activeOrderId() || undefined);
  }

  protected search(value: string): void {
    const orderId = value.trim();
    this.activeOrderId.set(orderId);
    this.location.replaceState(
      orderId ? `/orders/${encodeURIComponent(orderId)}/audit-log` : '/audit-log',
    );
    void this.audit.load(orderId || undefined);
  }

  protected clear(input: HTMLInputElement): void {
    input.value = '';
    this.search('');
    input.focus();
  }

  protected reload(): void {
    void this.audit.load(this.activeOrderId() || undefined);
  }

  protected back(): void {
    void this.router.navigateByUrl(this.session.homeRoute());
  }

  protected formatDate(value: string): string {
    return Number.isNaN(new Date(value).getTime()) ? value : dateTime(value);
  }

  protected actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
  }
}
