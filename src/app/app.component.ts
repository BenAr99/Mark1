import {Component, inject, signal} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {TelegramService} from './telegram.service';
import {MainButtonDirective} from './main-button.directive';

@Component({
  imports: [RouterOutlet, MainButtonDirective],
  selector: 'app-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class AppComponent {
  protected readonly title = signal('Mark1');
  readonly telegram = inject(TelegramService);

  readonly user = this.telegram.user;
  readonly count = signal(0);

  inc() { this.count.update(v => v + 1); this.telegram.haptic(); }
  dec() { this.count.update(v => v - 1); }
  reset() { this.count.set(0); }

  submit() { this.telegram.alert(`Отправлено: ${this.count()}`); }
}
