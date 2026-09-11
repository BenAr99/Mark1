import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ORDER_STATUS_LABEL, OrderStatus } from '../../orders/order.model';

/** Пилюля статуса заказа (frame 2:29). */
@Component({
  selector: 'app-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './status-pill.component.scss',
  template: `<span class="pill" [attr.data-status]="status()">{{ label() }}</span>`,
})
export class StatusPillComponent {
  status = input.required<OrderStatus>();

  protected readonly label = computed(() => ORDER_STATUS_LABEL[this.status()]);
}
