import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { describeHttpError } from './core/api';
import { AuthService } from './core/auth.service';
import { SessionService } from './core/session.service';
import { TelegramService } from './core/telegram.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly telegram = inject(TelegramService);

  /**
   * initData протухла (бэкенд режет `auth_date` старше суток). Экран не ломаем:
   * лечится переоткрытием мини-аппа, а до тех пор показываем подсказку.
   */
  protected readonly authExpired = computed(() => this.auth.state().status === 'expired');

  /** Пока роли нет, сбрасывать нечего — на экране выбора полоса не нужна. */
  protected readonly hasRole = computed(() => this.session.role() !== null);

  protected readonly roleLabel = computed(() =>
    this.session.role() === 'technician' ? 'Техник' : 'Врач',
  );

  protected readonly resetting = signal(false);

  protected retryAuth(): void {
    void this.auth.signInWithTelegram();
  }

  protected async resetRole(): Promise<void> {
    if (this.resetting()) return;

    const confirmed = await this.telegram.confirm(
      'Сбросить роль? Придётся выбрать её заново при следующем входе.',
    );
    if (!confirmed) return;

    this.resetting.set(true);

    try {
      await this.session.resetRole();
      void this.router.navigateByUrl('/role');
    } catch (error) {
      this.telegram.notify('error');
      this.telegram.alert(`Не удалось сбросить роль: ${describeHttpError(error)}`);
    } finally {
      this.resetting.set(false);
    }
  }
}
