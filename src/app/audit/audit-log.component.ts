import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../core/session.service';
import { dateTime } from '../orders/format';
import { ORDER_STATUS_LABEL, Role } from '../orders/order.model';
import { TgHeaderComponent } from '../shared/tg-header/tg-header.component';
import { AuditAction, AuditEntry, AuditFilters } from './audit.model';
import { AuditService } from './audit.service';

const ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  created: 'Карточка создана',
  opened: 'Карточка открыта',
  status_changed: 'Статус изменён',
  file_added: 'Файл добавлен',
  file_uploaded: 'Файл загружен',
  file_deleted: 'Файл удалён',
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
  private readonly initialQuery = this.route.snapshot.queryParamMap;

  protected readonly state = this.audit.state;
  protected readonly entries = this.audit.entries;
  protected readonly loadError = this.audit.error;
  protected readonly actors = this.audit.actors;
  protected readonly actorsError = this.audit.actorsError;

  protected readonly orderId = signal(
    this.route.snapshot.paramMap.get('orderId') ?? this.initialQuery.get('orderId') ?? '',
  );
  protected readonly patientName = signal(this.initialQuery.get('patientName') ?? '');
  protected readonly date = signal(this.initialQuery.get('date') ?? '');
  protected readonly actorId = signal(this.initialQuery.get('actorId') ?? '');
  protected readonly actorQuery = signal('');
  protected readonly actorPickerOpen = signal(false);

  protected readonly selectedActor = computed(
    () => this.actors().find((actor) => actor.id === this.actorId()) ?? null,
  );

  protected readonly filteredActors = computed(() => {
    const query = this.actorQuery().trim().toLocaleLowerCase('ru');
    if (!query) return this.actors();

    return this.actors().filter((actor) =>
      [actor.name, actor.telegram, actor.org].join(' ').toLocaleLowerCase('ru').includes(query),
    );
  });

  protected readonly hasFilters = computed(
    () => !!(this.orderId() || this.patientName() || this.date() || this.actorId()),
  );

  protected readonly subtitle = computed(() => {
    const count = [this.orderId(), this.patientName(), this.date(), this.actorId()].filter(
      Boolean,
    ).length;

    return count ? `Активных фильтров: ${count}` : 'Все действия';
  });

  constructor() {
    void this.audit.load(this.filters());
    void this.audit.loadActors();
  }

  protected valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected applyFilters(): void {
    this.actorPickerOpen.set(false);
    this.updateAddress();
    void this.audit.load(this.filters());
  }

  protected resetFilters(): void {
    this.orderId.set('');
    this.patientName.set('');
    this.date.set('');
    this.actorId.set('');
    this.actorQuery.set('');
    this.actorPickerOpen.set(false);
    this.location.replaceState('/audit-log');
    void this.audit.load();
  }

  protected selectActor(id: string): void {
    this.actorId.set(id);
    this.actorQuery.set('');
    this.actorPickerOpen.set(false);
  }

  protected clearActor(event: Event): void {
    event.stopPropagation();
    this.actorId.set('');
    this.actorQuery.set('');
  }

  protected reload(): void {
    void this.audit.load(this.filters());
  }

  protected back(): void {
    void this.router.navigateByUrl(this.session.homeRoute());
  }

  protected formatDate(value: string): string {
    return Number.isNaN(new Date(value).getTime()) ? value : dateTime(value);
  }

  protected actionLabel(action: AuditAction): string {
    return ACTION_LABELS[action];
  }

  protected actionDescription(entry: AuditEntry): string {
    if (entry.action === 'status_changed' && entry.fromStatus && entry.toStatus) {
      return `${ORDER_STATUS_LABEL[entry.fromStatus]} → ${ORDER_STATUS_LABEL[entry.toStatus]}`;
    }

    if (entry.fileName) return entry.fileName;

    return `Заказ №${entry.orderId}`;
  }

  protected roleLabel(role: Role | null): string {
    if (role === 'doctor') return 'Врач';
    if (role === 'technician') return 'Техник';

    return '';
  }

  private filters(): AuditFilters {
    return {
      orderId: this.orderId().trim() || undefined,
      patientName: this.patientName().trim() || undefined,
      date: this.date() || undefined,
      actorId: this.actorId() || undefined,
    };
  }

  private updateAddress(): void {
    const filters = this.filters();
    const params = new URLSearchParams();

    if (filters.orderId) params.set('orderId', filters.orderId);
    if (filters.patientName) params.set('patientName', filters.patientName);
    if (filters.date) params.set('date', filters.date);
    if (filters.actorId) params.set('actorId', filters.actorId);

    this.location.replaceState('/audit-log', params.toString());
  }
}
