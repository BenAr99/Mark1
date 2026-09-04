import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { OrderStatusBadgeComponent } from '../order-status-badge/order-status-badge.component';
import { Order } from '../order.model';

@Component({
  selector: 'app-order-card',
  imports: [OrderStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './order-card.component.scss',
  templateUrl: './order-card.component.html',
})
export class OrderCardComponent {
  order = input.required<Order>();
}
