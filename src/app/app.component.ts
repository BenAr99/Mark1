import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth.service';
import { SessionService } from './core/session.service';

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
  protected readonly session = inject(SessionService);

  /**
   * initData протухла (бэкенд режет `auth_date` старше суток). Экран не ломаем:
   * лечится переоткрытием мини-аппа, а до тех пор показываем подсказку.
   */
  protected readonly authExpired = computed(() => this.auth.state().status === 'expired');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Полоса подмены: напоминает админу, что он смотрит чужими глазами.
   * На самом экране выбора она не нужна — там это и так видно.
   */
  protected readonly showActingBar = computed(
    () => this.session.isActing() && !this.url().startsWith('/role'),
  );

  protected readonly actingName = computed(() => this.session.actingAs()?.name ?? 'пользователя');

  protected retryAuth(): void {
    void this.auth.signInWithTelegram();
  }

  /** Обратно в режим админа — на выбор человека. */
  protected stopActing(): void {
    this.session.stopActing();
    void this.router.navigateByUrl('/role');
  }

  protected openPicker(): void {
    void this.router.navigateByUrl('/role');
  }
}
