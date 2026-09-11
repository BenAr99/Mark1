import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TelegramService } from '../../core/telegram.service';

/**
 * Шапка мини-аппа: «← Заголовок / подзаголовок ×» (frame 2:12 и родственные).
 * Кнопка «назад» появляется, когда подписан обработчик `back`.
 */
@Component({
  selector: 'app-tg-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tg-header.component.scss',
  templateUrl: './tg-header.component.html',
})
export class TgHeaderComponent {
  private readonly telegram = inject(TelegramService);

  title = input.required<string>();
  subtitle = input<string>('');
  showBack = input(false);

  back = output<void>();

  protected close(): void {
    this.telegram.close();
  }
}
