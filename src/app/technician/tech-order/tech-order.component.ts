import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramService } from '../../core/telegram.service';
import { dateTime, longDate } from '../../orders/format';
import { ORDER_STATUS_LABEL, OrderStatus, statusIndex } from '../../orders/order.model';
import { OrdersService } from '../../orders/orders.service';
import { sortTeeth } from '../../orders/teeth';
import { FilesStripComponent } from '../../shared/files-strip/files-strip.component';
import {
  MainButtonComponent,
  MainButtonTone,
} from '../../shared/main-button/main-button.component';
import { StatusHeroComponent } from '../../shared/status-hero/status-hero.component';
import { TgHeaderComponent } from '../../shared/tg-header/tg-header.component';

/** Шаги, которыми управляет техник. */
const TECH_STEPS: readonly OrderStatus[] = ['accepted', 'in_progress', 'ready'];

const STEP_HINT: Record<string, string> = {
  accepted: 'подтвердить, что берёте заказ',
  in_progress: 'отметить, когда начали работу',
  ready: 'отметить, когда работа завершена',
};

interface StatusStep {
  status: OrderStatus;
  label: string;
  note: string;
  state: 'done' | 'current' | 'next' | 'later';
  mark: string | null;
}

const NEXT_ACTION: Partial<Record<OrderStatus, { text: string; tone: MainButtonTone }>> = {
  sent: { text: 'Принять заказ', tone: 'accent' },
  accepted: { text: 'Начать работу', tone: 'accent' },
  in_progress: { text: 'Отметить работу готовой', tone: 'green' },
};

/** 07 · Техник — Заказ (frame 7:93). */
@Component({
  selector: 'app-tech-order',
  imports: [TgHeaderComponent, StatusHeroComponent, FilesStripComponent, MainButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tech-order.component.scss',
  templateUrl: './tech-order.component.html',
})
export class TechOrderComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly telegram = inject(TelegramService);

  /** Приходит из маршрута `/tech/orders/:id`. */
  id = input.required<string>();

  protected readonly order = computed(() => this.ordersService.byId(this.id()));
  protected readonly loading = computed(
    () => !this.order() && this.ordersService.state() === 'loading',
  );
  protected readonly loadError = this.ordersService.error;
  protected readonly teeth = computed(() => sortTeeth(this.order()?.teeth ?? []).join(', '));
  protected readonly doctor = computed(() => this.order()?.doctor ?? null);

  protected readonly subtitle = computed(() => {
    const order = this.order();

    return order ? `${order.patientName} · ${this.doctor()?.orgShort}` : '';
  });

  protected readonly dueLabel = computed(() => longDate(this.order()?.dueDate ?? ''));

  protected readonly heroText = computed(() => {
    const order = this.order();
    if (!order) return '';

    switch (order.status) {
      case 'sent':
        return `Новый заказ от ${this.doctor()?.shortName}. Срок сдачи — ${this.dueLabel()}.`;
      case 'accepted':
        return `Заказ принят. Срок сдачи — ${this.dueLabel()}. Отметьте начало работы, когда приступите.`;
      case 'in_progress':
        return `Срок сдачи — ${this.dueLabel()}. Врач получит уведомление сразу после смены статуса.`;
      case 'ready':
        return `Работа отмечена готовой. Врач уведомлён и подтвердит получение после примерки.`;
      case 'delivered':
        return `Врач подтвердил получение. Заказ закрыт.`;
    }
  });

  protected readonly steps = computed<StatusStep[]>(() => {
    const order = this.order();
    if (!order) return [];

    const reached = statusIndex(order.status);

    return TECH_STEPS.map((status) => {
      const index = statusIndex(status);
      const event = order.history.find((entry) => entry.status === status);

      const state: StatusStep['state'] =
        index < reached
          ? 'done'
          : index === reached
            ? 'current'
            : index === reached + 1
              ? 'next'
              : 'later';

      return {
        status,
        label: ORDER_STATUS_LABEL[status],
        note: event ? dateTime(event.at) : STEP_HINT[status],
        state,
        mark:
          state === 'done'
            ? 'assets/figma/mark-done.svg'
            : state === 'current'
              ? 'assets/figma/mark-current.svg'
              : null,
      };
    });
  });

  protected readonly action = computed(() => {
    const order = this.order();

    return order ? (NEXT_ACTION[order.status] ?? null) : null;
  });

  constructor() {
    // Карточку открывают и по прямой ссылке из уведомления бота — тянем её сами.
    effect(() => void this.ordersService.loadOrder(this.id()));

    effect(() => {
      const order = this.order();
      if (order?.unread) void this.ordersService.markRead(order.id);
    });
  }

  protected back(): void {
    this.router.navigate(['/tech']);
  }

  protected writeToDoctor(): void {
    const doctor = this.doctor();
    if (doctor) this.telegram.openChat(doctor.telegram);
  }

  protected pickStep(step: StatusStep): void {
    const order = this.order();
    if (!order || step.state !== 'next') return;

    void this.ordersService.setStatus(order.id, step.status).then(
      () => this.telegram.notify('success'),
      () => this.telegram.notify('error'),
    );
  }

  protected async runAction(): Promise<void> {
    const order = this.order();
    if (!order) return;

    try {
      if (await this.ordersService.advance(order.id)) this.telegram.notify('success');
    } catch {
      this.telegram.notify('error');
    }
  }
}
