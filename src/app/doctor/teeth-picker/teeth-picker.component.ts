import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramService } from '../../core/telegram.service';
import { plural } from '../../orders/format';
import { FDI_ARCHES, sortTeeth, toothName } from '../../orders/teeth';
import { MainButtonComponent } from '../../shared/main-button/main-button.component';
import { TgHeaderComponent } from '../../shared/tg-header/tg-header.component';
import { NewOrderDraftService, TeethWork } from '../new-order-draft.service';

const TEETH_WORK_OPTIONS: readonly { value: TeethWork; label: string }[] = [
  { value: 'bridge', label: 'Мостовидный протез' },
  { value: 'separate', label: 'Отдельные коронки' },
];

/** 03 · Выбор зубов по схеме FDI (frame 4:2). */
@Component({
  selector: 'app-teeth-picker',
  imports: [TgHeaderComponent, MainButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './teeth-picker.component.scss',
  templateUrl: './teeth-picker.component.html',
})
export class TeethPickerComponent {
  private readonly router = inject(Router);
  private readonly telegram = inject(TelegramService);
  protected readonly drafts = inject(NewOrderDraftService);

  protected readonly arches = FDI_ARCHES;
  protected readonly workOptions = TEETH_WORK_OPTIONS;
  protected readonly toothName = toothName;

  protected readonly draft = this.drafts.draft;
  protected readonly selected = computed(() => sortTeeth(this.draft().teeth));

  protected readonly countLabel = computed(() => {
    const count = this.selected().length;

    return `${count} ${plural(count, 'зуб', 'зуба', 'зубов')}`;
  });

  protected isSelected(tooth: number): boolean {
    return this.draft().teeth.includes(tooth);
  }

  protected toggle(tooth: number): void {
    this.telegram.haptic('light');
    this.drafts.toggleTooth(tooth);
  }

  protected done(): void {
    this.router.navigate(['/doctor/new']);
  }
}
