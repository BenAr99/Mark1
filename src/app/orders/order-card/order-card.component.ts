import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StatusPillComponent } from '../../shared/status-pill/status-pill.component';
import { dueSuffix, daysUntil, shortDate } from '../format';
import { Order } from '../order.model';
import { sortTeeth } from '../teeth';

export type OrderCardVariant = 'doctor' | 'technician';

/** Карточка заказа в списке — frames 2:26 (врач) и 7:26 (техник). */
@Component({
  selector: 'app-order-card',
  imports: [StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './order-card.component.scss',
  templateUrl: './order-card.component.html',
})
export class OrderCardComponent {
  order = input.required<Order>();
  variant = input<OrderCardVariant>('doctor');

  open = output<Order>();
  accept = output<Order>();

  protected readonly teeth = computed(() => sortTeeth(this.order().teeth).join(', '));

  /** У сданных работ срок уже неинтересен — не подсвечиваем и не считаем дни. */
  private readonly dueMatters = computed(
    () => this.order().status !== 'ready' && this.order().status !== 'delivered',
  );

  protected readonly dueText = computed(() => {
    const order = this.order();
    const note = this.dueMatters() ? dueSuffix(order.dueDate) : '';

    return `Срок: ${shortDate(order.dueDate)}${note ? ` ${note}` : ''}`;
  });

  protected readonly dueUrgent = computed(
    () => this.dueMatters() && (daysUntil(this.order().dueDate) ?? Number.POSITIVE_INFINITY) <= 1,
  );

  protected readonly technician = computed(() => this.order().technician);
  protected readonly doctor = computed(() => this.order().doctor);

  protected readonly canAccept = computed(
    () => this.variant() === 'technician' && this.order().status === 'sent',
  );

  protected onAccept(event: Event): void {
    event.stopPropagation();
    this.accept.emit(this.order());
  }
}
