import { Directive, DestroyRef, effect, inject, input, output } from '@angular/core';
import { TelegramService } from './telegram.service';

@Directive({ selector: '[tgMainButton]' })
export class MainButtonDirective {
  private telegram = inject(TelegramService);

  text = input.required<string>({ alias: 'tgMainButton' });
  loading = input(false);
  pressed = output<void>();

  private handler = () => this.pressed.emit();

  constructor() {
    const btn = this.telegram.tg?.MainButton;

    effect(() => {
      if (!btn) return;
      btn.setText(this.text()).show();
      this.loading() ? btn.showProgress() : btn.hideProgress();
    });

    btn?.onClick(this.handler);

    inject(DestroyRef).onDestroy(() => {
      btn?.offClick(this.handler);
      btn?.hide();
    });
  }
}
