import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../order.model';
import { OrdersService } from '../orders.service';
import { TelegramService } from '../../telegram.service';

interface Technician {
  id: string;
  name: string;
  lab: string;
  ordersCount: number;
}

interface DraftFile {
  id: string;
  name: string;
  kind: 'stl' | 'image' | 'other';
}

interface NewOrderDraft {
  patientName: string;
  teeth: number[];
  workType: string;
  dueDate: string;
  shade: string;
  technician: Technician | null;
  files: DraftFile[];
  comment: string;
}

const EMPTY_DRAFT: NewOrderDraft = {
  patientName: '',
  teeth: [],
  workType: '',
  dueDate: '',
  shade: '',
  technician: null,
  files: [],
  comment: '',
};

const TECHNICIANS: Technician[] = [
  { id: 't1', name: 'Рустам Ахметов', lab: 'Лаборатория «ОртоЛаб»', ordersCount: 4 },
  { id: 't2', name: 'Алина Гизатуллина', lab: 'Лаборатория «Дентал Про»', ordersCount: 7 },
  { id: 't3', name: 'Марат Юсупов', lab: 'Лаборатория «ОртоЛаб»', ordersCount: 2 },
];

const WORK_TYPES = [
  'Коронка МК',
  'Коронка Цирконий',
  'Винир E-max',
  'Бюгельный протез',
  'Съёмный протез',
];

const SHADES = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2'];

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

@Component({
  selector: 'app-new-order',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './new-order.component.scss',
  templateUrl: './new-order.component.html',
})
export class NewOrderComponent {
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly telegram = inject(TelegramService);

  protected readonly technicians = TECHNICIANS;
  protected readonly workTypes = WORK_TYPES;
  protected readonly shades = SHADES;
  protected readonly upperTeeth = UPPER_TEETH;
  protected readonly lowerTeeth = LOWER_TEETH;

  protected readonly draft = signal<NewOrderDraft>(EMPTY_DRAFT);
  protected readonly showToothPicker = signal(false);
  protected readonly showTechnicianPicker = signal(false);
  protected readonly submitting = signal(false);

  protected readonly sortedTeeth = computed(() => [...this.draft().teeth].sort((a, b) => a - b));

  protected readonly isDirty = computed(
    () => JSON.stringify(this.draft()) !== JSON.stringify(EMPTY_DRAFT),
  );

  protected readonly canSubmit = computed(() => {
    const d = this.draft();
    return (
      d.patientName.trim().length > 0 &&
      d.teeth.length > 0 &&
      d.workType.length > 0 &&
      d.technician !== null
    );
  });

  protected readonly statusLabel = computed(() =>
    this.submitting() ? 'Отправка технику…' : 'Черновик · не отправлен',
  );

  setPatientName(name: string): void {
    this.draft.update((d) => ({ ...d, patientName: name }));
  }

  toggleToothPicker(): void {
    this.showToothPicker.update((v) => !v);
  }

  toggleTooth(tooth: number): void {
    this.draft.update((d) => ({
      ...d,
      teeth: d.teeth.includes(tooth) ? d.teeth.filter((t) => t !== tooth) : [...d.teeth, tooth],
    }));
  }

  removeTooth(tooth: number): void {
    this.draft.update((d) => ({ ...d, teeth: d.teeth.filter((t) => t !== tooth) }));
  }

  setWorkType(workType: string): void {
    this.draft.update((d) => ({ ...d, workType }));
  }

  setDueDate(dueDate: string): void {
    this.draft.update((d) => ({ ...d, dueDate }));
  }

  setShade(shade: string): void {
    this.draft.update((d) => ({ ...d, shade }));
  }

  toggleTechnicianPicker(): void {
    this.showTechnicianPicker.update((v) => !v);
  }

  selectTechnician(technician: Technician): void {
    this.draft.update((d) => ({ ...d, technician }));
    this.showTechnicianPicker.set(false);
  }

  addFiles(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) return;

    const files: DraftFile[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      kind: fileKind(file.name),
    }));

    this.draft.update((d) => ({ ...d, files: [...d.files, ...files] }));
  }

  removeFile(id: string): void {
    this.draft.update((d) => ({ ...d, files: d.files.filter((f) => f.id !== id) }));
  }

  setComment(comment: string): void {
    this.draft.update((d) => ({ ...d, comment }));
  }

  async leave(): Promise<void> {
    if (this.isDirty()) {
      const confirmed = await this.telegram.confirm(
        'Черновик заказа не сохранён. Уйти без сохранения?',
      );
      if (!confirmed) return;
    }
    this.router.navigate(['/']);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.submitting()) return;

    this.submitting.set(true);
    const d = this.draft();
    const technician = d.technician!;

    await new Promise((resolve) => setTimeout(resolve, 600));

    const order: Order = {
      id: crypto.randomUUID(),
      patientName: d.patientName.trim(),
      status: 'sent',
      teeth: this.sortedTeeth(),
      workType: d.workType,
      dueDate: formatDueDate(d.dueDate),
      assignee: initialsName(technician.name),
    };

    this.ordersService.addOrder(order);
    this.submitting.set(false);
    this.telegram.haptic('medium');
    this.router.navigate(['/']);
  }
}

function fileKind(name: string): DraftFile['kind'] {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'stl') return 'stl';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'image';
  return 'other';
}

function initialsName(name: string): string {
  const [first, ...rest] = name.split(' ');
  return rest.length ? `${first[0]}. ${rest.join(' ')}` : name;
}

function formatDueDate(iso: string): string {
  if (!iso) return 'Не указан';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
}
