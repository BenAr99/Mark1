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

  /** Скан всегда серо-синий, фото чередуются тёплым и холодным — как в макете. */
  protected tone(file: OrderFile, index: number): Tone {
    if (file.kind === 'stl') return 'stl';

    return index % 2 === 0 ? 'cool' : 'warm';
  }

  protected label(file: OrderFile): string {
    return file.name.split('.').pop()?.toUpperCase() || 'FILE';
  }
}
