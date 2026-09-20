import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramService } from '../../core/telegram.service';
import { dateTime, longDate, plural } from '../../orders/format';
import { OrderFile } from '../../orders/order.model';
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
  protected readonly loading = computed(
    () => !this.order() && this.ordersService.state() === 'loading',
  );
  protected readonly loadError = this.ordersService.error;
  protected readonly teeth = computed(() => sortTeeth(this.order()?.teeth ?? []).join(', '));
  protected readonly technician = computed(() => this.order()?.technician ?? null);

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
    // Карточку открывают и по прямой ссылке из уведомления бота — тянем её сами.
    effect(() => void this.ordersService.loadOrder(this.id()));

    effect(() => {
      const order = this.order();
      if (order?.unread) void this.ordersService.markRead(order.id);
    });
  }

  protected back(): void {
    this.router.navigate(['/doctor']);
  }

  protected writeToTechnician(): void {
    const technician = this.technician();
    if (technician) this.telegram.openChat(technician.telegram);
  }

  protected async downloadFile(file: OrderFile): Promise<void> {
    const order = this.order();
    if (!order) return;

    try {
      await this.ordersService.downloadFile(order.id, file);
    } catch {
      this.telegram.notify('error');
      this.telegram.alert(`Не удалось скачать файл «${file.name}».`);
    }
  }

  protected confirmDelivery(): void {
    const order = this.order();
    if (!order || !this.canConfirm()) return;

    void this.ordersService.setStatus(order.id, 'delivered').then(
      () => this.telegram.notify('success'),
      () => this.telegram.notify('error'),
    );
  }
}
