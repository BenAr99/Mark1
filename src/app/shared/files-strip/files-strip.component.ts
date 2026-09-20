import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { OrderFile } from '../../orders/order.model';

type Tone = 'stl' | 'warm' | 'cool';

/** Полоска вложений (frames 3:75 и 7:170). */
@Component({
  selector: 'app-files-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './files-strip.component.scss',
  templateUrl: './files-strip.component.html',
})
export class FilesStripComponent {
  files = input.required<readonly OrderFile[]>();
  editable = input(false);

  add = output<FileList | null>();
  remove = output<string>();
  open = output<OrderFile>();

  /** Скан всегда серо-синий, фото чередуются тёплым и холодным — как в макете. */
  protected tone(file: OrderFile, index: number): Tone {
    if (file.kind === 'stl') return 'stl';

    return index % 2 === 0 ? 'cool' : 'warm';
  }

  protected label(file: OrderFile): string {
    return file.name.split('.').pop()?.toUpperCase() || 'FILE';
  }

  protected selectFiles(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    this.add.emit(input.files);
    input.value = '';
  }

  protected activate(file: OrderFile): void {
    if (!this.editable() && file.uploaded) this.open.emit(file);
  }

  protected activateFromKeyboard(event: KeyboardEvent, file: OrderFile): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.activate(file);
  }
}
