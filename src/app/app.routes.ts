import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authorizedGuard, noRoleGuard, roleGuard } from './core/role.guard';
import { SessionService } from './core/session.service';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const session = inject(SessionService);

      return session.isAuthorized() ? session.homeRoute() : '/auth';
    },
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./core/auth-gate/auth-gate.component').then((module) => module.AuthGateComponent),
  },
  {
    path: 'role',
    canActivate: [noRoleGuard],
    loadComponent: () =>
      import('./role-select/role-select.component').then((module) => module.RoleSelectComponent),
  },
  {
    path: 'audit-log',
    canActivate: [authorizedGuard],
    loadComponent: () =>
      import('./audit/audit-log.component').then((module) => module.AuditLogComponent),
  },
  {
    path: 'orders/:orderId/audit-log',
    canActivate: [authorizedGuard],
    loadComponent: () =>
      import('./audit/audit-log.component').then((module) => module.AuditLogComponent),
  },
  {
    path: 'doctor',
    canActivate: [roleGuard('doctor')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./doctor/doctor-orders/doctor-orders.component').then(
            (module) => module.DoctorOrdersComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./doctor/new-order/new-order.component').then(
            (module) => module.NewOrderComponent,
          ),
      },
      {
        path: 'new/teeth',
        loadComponent: () =>
          import('./doctor/teeth-picker/teeth-picker.component').then(
            (module) => module.TeethPickerComponent,
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./doctor/doctor-order/doctor-order.component').then(
            (module) => module.DoctorOrderComponent,
          ),
      },
    ],
  },
  {
    path: 'tech',
    canActivate: [roleGuard('technician')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./technician/tech-orders/tech-orders.component').then(
            (module) => module.TechOrdersComponent,
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./technician/tech-order/tech-order.component').then(
            (module) => module.TechOrderComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
