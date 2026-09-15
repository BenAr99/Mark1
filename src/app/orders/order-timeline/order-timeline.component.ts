import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { dateTime } from '../format';
import {
  Order,
  ORDER_FLOW,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OWNER,
  OrderStatus,
  Role,
  statusIndex,
} from '../order.model';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  owner: Role;
  /** Время события; у ещё не наступивших шагов пусто. */
  note: string;
  done: boolean;
  current: boolean;
  /** Закрашен ли отрезок до следующего шага. */
  linkDone: boolean;
  last: boolean;
}

/** «Ход работы» — вертикальный таймлайн статусов (frame 5:28). */
@Component({
  selector: 'app-order-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './order-timeline.component.scss',
  templateUrl: './order-timeline.component.html',
})
export class OrderTimelineComponent {
  order = input.required<Order>();

  protected readonly steps = computed<TimelineStep[]>(() => {
    const order = this.order();
    const reached = statusIndex(order.status);

    return ORDER_FLOW.map((status, index) => {
      const event = order.history.find((entry) => entry.status === status);
      const done = index <= reached;

      return {
        status,
        label: ORDER_STATUS_LABEL[status],
        owner: ORDER_STATUS_OWNER[status],
        note: event ? dateTime(event.at) : '',
        done,
        current: index === reached,
        linkDone: index < reached,
        last: index === ORDER_FLOW.length - 1,
      };
    });
  });

  protected dot(step: TimelineStep): string | null {
    if (!step.done) return null;

    return step.current
      ? 'assets/figma/timeline-dot-current.svg'
      : 'assets/figma/timeline-dot-done.svg';
  }
}

