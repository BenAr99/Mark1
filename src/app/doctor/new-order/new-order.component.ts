import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { describeHttpError } from '../../core/api';
import { TelegramService } from '../../core/telegram.service';
import { longDate } from '../../orders/format';
import { OrdersService, SHADES, WORK_TYPES } from '../../orders/orders.service';
import { sortTeeth } from '../../orders/teeth';
import { FilesStripComponent } from '../../shared/files-strip/files-strip.component';
import { MainButtonComponent } from '../../shared/main-button/main-button.component';
import { TgHeaderComponent } from '../../shared/tg-header/tg-header.component';
import { NewOrderDraftService } from '../new-order-draft.service';

/** 02 · Врач — Новый заказ (frame 3:2). */
@Component({
  selector: 'app-new-order',
  imports: [TgHeaderComponent, FilesStripComponent, MainButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './new-order.component.scss',
  templateUrl: './new-order.component.html',
})
export class NewOrderComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly telegram = inject(TelegramService);
  protected readonly drafts = inject(NewOrderDraftService);

  protected readonly workTypes = WORK_TYPES;
  protected readonly shades = SHADES;
  protected readonly technicians = this.ordersService.technicians;
  protected readonly peopleError = this.ordersService.peopleError;

  protected readonly pickingTechnician = signal(false);
  protected readonly submitting = signal(false);

  protected readonly draft = this.drafts.draft;
  protected readonly teeth = computed(() => sortTeeth(this.draft().teeth));

  protected readonly technician = computed(() => {
    const id = this.draft().technicianId;

    return id ? (this.technicians().find((person) => person.id === id) ?? null) : null;
  });

  protected readonly dueLabel = computed(() => longDate(this.draft().dueDate));

  protected readonly subtitle = computed(() =>
    this.submitting() ? 'Отправка технику…' : 'Черновик · не отправлен',
  );

  constructor() {
    // Загрузку исполнителей считает бэкенд — она приходит вместе со списком.
    void this.ordersService.loadTechnicians();
  }

  protected load(technicianId: string): number {
    return this.technicians().find((person) => person.id === technicianId)?.load ?? 0;
  }

  protected pickTechnician(id: string): void {
    this.drafts.patch({ technicianId: id });
    this.pickingTechnician.set(false);
  }

  /**
   * Прозрачный `input[type=date]` в десктопном Chrome сам календарь не открывает —
   * дёргаем его вручную, с откатом на фокус там, где `showPicker` недоступен.
   */
  protected openDatePicker(input: HTMLInputElement): void {
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  protected openTeethPicker(): void {
    this.router.navigate(['/doctor/new/teeth']);
  }

  protected async leave(): Promise<void> {
    if (this.drafts.isDirty()) {
      const confirmed = await this.telegram.confirm(
        'Черновик заказа не сохранён. Уйти без сохранения?',
      );
      if (!confirmed) return;
    }

    this.drafts.reset();
    this.router.navigate(['/doctor']);
  }

  protected async submit(): Promise<void> {
    if (!this.drafts.isComplete() || this.submitting()) return;

    this.submitting.set(true);

    try {
      // Врача и начальный статус проставляет бэкенд — он знает, кто прислал токен.
      const order = await this.ordersService.create(this.draft());

      this.drafts.reset();
      this.telegram.notify('success');
      void this.router.navigate(['/doctor/orders', order.id]);
    } catch (error) {
      this.telegram.notify('error');
      this.telegram.alert(`Не удалось отправить заказ: ${describeHttpError(error)}`);
    } finally {
      this.submitting.set(false);
    }
  }
}
