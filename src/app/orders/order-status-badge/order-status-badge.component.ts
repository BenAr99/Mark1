import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ORDER_STATUS_LABEL, OrderStatus } from '../order.model';

@Component({
  selector: 'app-order-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './order-status-badge.component.scss',
  templateUrl: './order-status-badge.component.html',
})
export class OrderStatusBadgeComponent {
  status = input.required<OrderStatus>();

  protected readonly label = computed(() => ORDER_STATUS_LABEL[this.status()]);
}
