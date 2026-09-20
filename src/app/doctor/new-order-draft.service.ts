import { computed, Service, signal } from '@angular/core';
import { parseFileKind } from '../orders/order.mapper';
import { OrderFile } from '../orders/order.model';

/** Как трактовать выбранные зубы — вопрос со схемы FDI (frame 4:148). */
export type TeethWork = 'bridge' | 'separate';

export interface NewOrderDraft {
  patientName: string;
  teeth: number[];
  teethWork: TeethWork;
  workType: string;
  /** Значение `input[type=date]`. */
  dueDate: string;
  shade: string;
  technicianId: string | null;
  files: OrderFile[];
  comment: string;
}

const EMPTY_DRAFT: NewOrderDraft = {
  patientName: '',
  teeth: [],
  teethWork: 'bridge',
  workType: '',
  dueDate: '',
  shade: '',
  technicianId: null,
  files: [],
  comment: '',
};

/**
 * Черновик нового заказа живёт между двумя экранами — формой и схемой зубов,
 * поэтому хранится отдельно от компонентов.
 */
@Service()
export class NewOrderDraftService {
  private readonly _draft = signal<NewOrderDraft>(EMPTY_DRAFT);
  readonly draft = this._draft.asReadonly();

  readonly isDirty = computed(() => JSON.stringify(this._draft()) !== JSON.stringify(EMPTY_DRAFT));

  readonly isComplete = computed(() => {
    const draft = this._draft();

    return (
      draft.patientName.trim().length > 0 &&
      draft.teeth.length > 0 &&
      draft.workType.length > 0 &&
      draft.technicianId !== null
    );
  });

  patch(changes: Partial<NewOrderDraft>): void {
    this._draft.update((draft) => ({ ...draft, ...changes }));
  }

  toggleTooth(tooth: number): void {
    this._draft.update((draft) => ({
      ...draft,
      teeth: draft.teeth.includes(tooth)
        ? draft.teeth.filter((selected) => selected !== tooth)
        : [...draft.teeth, tooth],
    }));
  }

  removeTooth(tooth: number): void {
    this._draft.update((draft) => ({
      ...draft,
      teeth: draft.teeth.filter((selected) => selected !== tooth),
    }));
  }

  addFiles(list: FileList | null): void {
    if (!list?.length) return;

    const files: OrderFile[] = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      kind: parseFileKind(file.name),
    }));

    this._draft.update((draft) => ({ ...draft, files: [...draft.files, ...files] }));
  }

  removeFile(id: string): void {
    this._draft.update((draft) => ({
      ...draft,
      files: draft.files.filter((file) => file.id !== id),
    }));
  }

  reset(): void {
    this._draft.set(EMPTY_DRAFT);
  }
}
