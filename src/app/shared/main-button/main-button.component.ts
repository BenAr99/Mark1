import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { TelegramService } from '../../core/telegram.service';

export type MainButtonTone = 'accent' | 'green';

const TONE_COLOR: Record<MainButtonTone, string> = {
  accent: '#3390ec',
  green: '#34c759',
};

/**
 * Нижняя кнопка действия (frame 2:86 «MainButton area»).
 * Внутри Telegram отдаём управление нативной MainButton, в браузере рисуем сами —
 * так демо остаётся кликабельным до подключения бота.
 */
@Component({
  selector: 'app-main-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './main-button.component.scss',
  templateUrl: './main-button.component.html',
})
export class MainButtonComponent {
  private readonly telegram = inject(TelegramService);

  text = input.required<string>();
  tone = input<MainButtonTone>('accent');
  disabled = input(false);
  loading = input(false);

  pressed = output<void>();

  protected readonly native = this.telegram.isTelegram;

  private readonly onNativeClick = () => {
    if (!this.disabled() && !this.loading()) this.pressed.emit();
  };

  constructor() {
    const button = this.telegram.tg?.MainButton;

    if (button) {
      effect(() => {
        button.setParams({
          text: this.text(),
          color: TONE_COLOR[this.tone()],
          text_color: '#ffffff',
          is_active: !this.disabled(),
          is_visible: true,
        });
        this.loading() ? button.showProgress(true) : button.hideProgress();
      });

      button.onClick(this.onNativeClick);

      inject(DestroyRef).onDestroy(() => {
        button.offClick(this.onNativeClick);
        button.hide();
      });
    }
  }

  protected press(): void {
    this.telegram.haptic('medium');
    this.pressed.emit();
  }
}
