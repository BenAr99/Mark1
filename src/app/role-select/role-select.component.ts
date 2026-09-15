import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { describeHttpError } from '../core/api';
import { SessionService } from '../core/session.service';
import { TelegramService } from '../core/telegram.service';
import { Role } from '../orders/order.model';

interface RoleOption {
  role: Role;
  label: string;
  hint: string;
}

const OPTIONS: readonly RoleOption[] = [
  {
    role: 'doctor',
    label: 'Врач',
    hint: 'Создаёте заказы и отправляете их в лабораторию',
  },
  {
    role: 'technician',
    label: 'Техник',
    hint: 'Принимаете заказы от врачей и ведёте их по статусам',
  },
];

/**
 * Первый вход: у аккаунта ещё нет роли, и бэкенд ждёт `POST /me/role`.
 * Выбор делается один раз — дальше сюда не пускает `noRoleGuard`.
 */
@Component({
  selector: 'app-role-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './role-select.component.scss',
  templateUrl: './role-select.component.html',
})
export class RoleSelectComponent {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly telegram = inject(TelegramService);

  protected readonly options = OPTIONS;
  protected readonly saving = signal<Role | null>(null);
  protected readonly error = signal('');

  protected async choose(option: RoleOption): Promise<void> {
    if (this.saving()) return;

    this.saving.set(option.role);
    this.error.set('');

    try {
      await this.session.setRole(option.role);
      this.telegram.notify('success');
      void this.router.navigateByUrl(this.session.homeRoute());
    } catch (error) {
      this.telegram.notify('error');
      this.error.set(describeHttpError(error));
    } finally {
      this.saving.set(null);
    }
  }
}
