import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { DEMO_IDENTITIES, DemoIdentity, SessionService } from './core/session.service';
import { OrdersService } from './orders/orders.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  protected readonly session = inject(SessionService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Панель переключения ролей не нужна на самом экране выбора. */
  protected readonly showDemoBar = computed(
    () => !this.url().startsWith('/role') && this.session.role() !== null,
  );

  protected readonly identities = DEMO_IDENTITIES.map((identity) => ({
    identity,
    label: identity.role === 'doctor' ? 'Врач' : 'Техник',
    name: this.ordersService.person(identity.personId).name,
  }));

  protected isCurrent(identity: DemoIdentity): boolean {
    const current = this.session.identity();

    return current?.role === identity.role && current?.personId === identity.personId;
  }

  protected switchTo(identity: DemoIdentity): void {
    if (this.isCurrent(identity)) return;

    this.session.signIn(identity);
    this.router.navigateByUrl(this.session.homeRoute());
  }

  protected openGate(): void {
    this.router.navigate(['/role']);
  }
}
