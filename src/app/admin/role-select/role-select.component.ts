import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { describeHttpError } from '../../core/api';
import { SessionService } from '../../core/session.service';
import { TelegramService } from '../../core/telegram.service';
import { PersonOption } from '../../orders/order.mapper';
import { WorkRole } from '../../orders/order.model';
import { OrdersService } from '../../orders/orders.service';
import { SegmentedComponent, SegmentedItem } from '../../shared/segmented/segmented.component';
import { TgHeaderComponent } from '../../shared/tg-header/tg-header.component';

/**
 * Выбор человека для админа: приложение дальше работает от его лица по токену
 * из `POST /admin/act-as/{id}`. Обычные роли сюда не попадают — их держит
 * `adminGuard`, у них личность одна.
 */
@Component({
  selector: 'app-role-select',
  imports: [TgHeaderComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './role-select.component.scss',
  templateUrl: './role-select.component.html',
})
export class RoleSelectComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly session = inject(SessionService);
  private readonly telegram = inject(TelegramService);

  protected readonly filters: readonly SegmentedItem<WorkRole>[] = [
    { value: 'doctor', label: 'Врачи' },
    { value: 'technician', label: 'Техники' },
  ];

  protected readonly filter = signal<WorkRole>('doctor');

  protected readonly people = computed<readonly PersonOption[]>(() =>
    this.filter() === 'doctor' ? this.ordersService.doctors() : this.ordersService.technicians(),
  );

  protected readonly loadError = this.ordersService.peopleError;

  /** Кого админ смотрит прямо сейчас — чтобы отметить строку в списке. */
  protected readonly currentId = computed(() =>
    this.session.isActing() ? this.session.userId() : null,
  );

  protected readonly entering = signal<string | null>(null);

  protected readonly subtitle = computed(() => {
    const acting = this.session.actingAs();

    return acting ? `Сейчас: ${acting.name}` : 'Выберите, от чьего лица смотреть';
  });

  constructor() {
    void this.reload();
  }

  protected reload(): Promise<void> {
    return Promise.all([
      this.ordersService.loadDoctors(),
      this.ordersService.loadTechnicians(),
    ]).then(() => undefined);
  }

  protected async enter(person: PersonOption): Promise<void> {
    if (this.entering()) return;

    this.entering.set(person.id);

    try {
      await this.session.actAs(person.id);
      this.telegram.haptic();
      void this.router.navigateByUrl(this.session.homeRoute());
    } catch (error) {
      this.telegram.notify('error');
      this.telegram.alert(`Не удалось войти от лица «${person.name}»: ${describeHttpError(error)}`);
    } finally {
      this.entering.set(null);
    }
  }
}
