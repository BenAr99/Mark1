import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ORDER_STATUS_LABEL, OrderStatus } from '../../orders/order.model';

/** Экспортированные из Figma точки статуса (10×10). */
const DOT_ASSET: Partial<Record<OrderStatus, string>> = {
  in_progress: 'assets/figma/hero-dot-progress.svg',
  ready: 'assets/figma/hero-dot-ready.svg',
};

/** Плашка текущего статуса заказа (frames 5:20 и 7:111). */
@Component({
  selector: 'app-status-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './status-hero.component.scss',
  templateUrl: './status-hero.component.html',
})
export class StatusHeroComponent {
  status = input.required<OrderStatus>();
  text = input.required<string>();

  protected readonly label = computed(() => ORDER_STATUS_LABEL[this.status()]);
  protected readonly dot = computed(() => DOT_ASSET[this.status()] ?? null);
}
