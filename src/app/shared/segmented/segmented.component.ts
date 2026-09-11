import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentedItem<T extends string> {
  value: T;
  label: string;
  /** Число справа от подписи: «Новые · 2». */
  count?: number;
}

/** Сегмент-контрол в стиле iOS (frame 2:19). */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './segmented.component.scss',
  templateUrl: './segmented.component.html',
})
export class SegmentedComponent<T extends string> {
  items = input.required<readonly SegmentedItem<T>[]>();
  value = model.required<T>();
}
