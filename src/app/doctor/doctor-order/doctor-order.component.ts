import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramService } from '../../core/telegram.service';
import { dateTime, longDate, plural } from '../../orders/format';
import { OrderTimelineComponent } from '../../orders/order-timeline/order-timeline.component';
import { OrdersService } from '../../orders/orders.service';
import { sortTeeth } from '../../orders/teeth';
import { FilesStripComponent } from '../../shared/files-strip/files-strip.component';
import { MainButtonComponent } from '../../shared/main-button/main-button.component';
import { StatusHeroComponent } from '../../shared/status-hero/status-hero.component';
import { TgHeaderComponent } from '../../shared/tg-header/tg-header.component';

/** 04 · Врач — Карточка заказа (frame 5:2). */
@Component({
  selector: 'app-doctor-order',
  imports: [
    TgHeaderComponent,
    StatusHeroComponent,
    OrderTimelineComponent,
    FilesStripComponent,
    MainButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './doctor-order.component.scss',
  templateUrl: './doctor-order.component.html',
})
export class DoctorOrderComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly telegram = inject(TelegramService);

  /** Приходит из маршрута `/doctor/orders/:id`. */
  id = input.required<string>();

  protected readonly order = computed(() => this.ordersService.byId(this.id()));
  protected readonly teeth = computed(() => sortTeeth(this.order()?.teeth ?? []).join(', '));
  protected readonly technician = computed(() => {
    const order = this.order();

    return order ? this.ordersService.person(order.technicianId) : null;
  });

  protected readonly subtitle = computed(() => {
    const order = this.order();

    return order ? `${order.patientName} · ${this.teeth()}` : '';
  });

  protected readonly heroText = computed(() => {
    const order = this.order();
    if (!order) return '';

    const at = [...order.history].reverse().find((entry) => entry.status === order.status)?.at;
    const stamp = at ? dateTime(at) : '';
    const technician = this.technician()?.name ?? 'Техник';

    switch (order.status) {
      case 'sent':
        return `Заказ отправлен технику (${technician}). Ждём подтверждения — бот пришлёт уведомление.`;
      case 'accepted':
        return `${technician} принял заказ в работу ${stamp}. Срок сдачи — ${longDate(order.dueDate)}.`;
      case 'in_progress':
        return `Работа начата ${stamp}. Срок сдачи — ${longDate(order.dueDate)}.`;
      case 'ready':
        return `Техник отметил работу готовой ${stamp}. Подтвердите получение после примерки.`;
      case 'delivered':
        return `Вы подтвердили получение ${stamp}. Заказ закрыт.`;
    }
  });

  protected readonly filesLabel = computed(() => {
    const count = this.order()?.files.length ?? 0;

    return `${count} ${plural(count, 'вложение', 'вложения', 'вложений')}`;
  });

  protected readonly dueLabel = computed(() => longDate(this.order()?.dueDate ?? ''));

  /** Врач подтверждает получение только когда работа готова. */
  protected readonly canConfirm = computed(() => this.order()?.status === 'ready');

  constructor() {
    effect(() => {
      const order = this.order();
      if (order?.unread) this.ordersService.markRead(order.id);
    });
  }

  protected back(): void {
    this.router.navigate(['/doctor']);
  }

  protected writeToTechnician(): void {
    const technician = this.technician();
    if (technician) this.telegram.openChat(technician.telegram);
  }

  protected confirmDelivery(): void {
    const order = this.order();
    if (!order || !this.canConfirm()) return;

    this.ordersService.setStatus(order.id, 'delivered');
    this.telegram.notify('success');
  }
}
