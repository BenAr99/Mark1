import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly auth = inject(AuthService);

  /**
   * initData протухла (бэкенд режет `auth_date` старше суток). Экран не ломаем:
   * лечится переоткрытием мини-аппа, а до тех пор показываем подсказку.
   */
  protected readonly authExpired = computed(() => this.auth.state().status === 'expired');

  protected retryAuth(): void {
    void this.auth.signInWithTelegram();
  }
}
