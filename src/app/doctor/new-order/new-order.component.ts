import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { TelegramService } from '../../core/telegram.service';
import { longDate } from '../../orders/format';
import { Order } from '../../orders/order.model';
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
  private readonly session = inject(SessionService);
  protected readonly drafts = inject(NewOrderDraftService);

  protected readonly workTypes = WORK_TYPES;
  protected readonly shades = SHADES;
  protected readonly technicians = this.ordersService.technicians;

  protected readonly pickingTechnician = signal(false);
  protected readonly submitting = signal(false);

  protected readonly draft = this.drafts.draft;
  protected readonly teeth = computed(() => sortTeeth(this.draft().teeth));

  protected readonly technician = computed(() => {
    const id = this.draft().technicianId;

    return id ? this.ordersService.person(id) : null;
  });

  protected readonly dueLabel = computed(() => longDate(this.draft().dueDate));

  protected readonly subtitle = computed(() =>
    this.submitting() ? 'Отправка технику…' : 'Черновик · не отправлен',
  );

  protected load(technicianId: string): number {
    return this.ordersService.loadOf(technicianId);
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
    const draft = this.draft();

    // Имитация запроса к боту: бэкенда пока нет.
    await new Promise((resolve) => setTimeout(resolve, 600));

    const teeth = sortTeeth(draft.teeth);

    const order: Order = {
      id: String(1046 + this.ordersService.orders().length),
      patientName: draft.patientName.trim(),
      patientShort: shortenName(draft.patientName.trim()),
      teeth,
      workType: draft.workType,
      workSummary: `${draft.workType}, ${teeth.length} ед.`,
      shade: draft.shade,
      dueDate: draft.dueDate,
      comment: draft.comment.trim(),
      files: draft.files,
      doctorId: this.session.identity()!.personId,
      technicianId: draft.technicianId!,
      status: 'sent',
      history: [{ status: 'sent', at: new Date().toISOString() }],
      unread: 0,
    };

    this.ordersService.add(order);
    this.drafts.reset();
    this.submitting.set(false);
    this.telegram.notify('success');
    this.router.navigate(['/doctor/orders', order.id]);
  }
}

/** «Иванов Артём Петрович» → «Иванов А. П.» */
function shortenName(full: string): string {
  const [surname, ...rest] = full.split(/\s+/).filter(Boolean);
  if (!surname) return full;

  const initials = rest.map((part) => `${part[0].toUpperCase()}.`).join(' ');

  return initials ? `${surname} ${initials}` : surname;
}
