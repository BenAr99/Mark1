import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthGateComponent } from './core/auth-gate/auth-gate.component';
import { roleGuard } from './core/role.guard';
import { SessionService } from './core/session.service';
import { DoctorOrderComponent } from './doctor/doctor-order/doctor-order.component';
import { DoctorOrdersComponent } from './doctor/doctor-orders/doctor-orders.component';
import { NewOrderComponent } from './doctor/new-order/new-order.component';
import { TeethPickerComponent } from './doctor/teeth-picker/teeth-picker.component';
import { TechOrderComponent } from './technician/tech-order/tech-order.component';
import { TechOrdersComponent } from './technician/tech-orders/tech-orders.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const session = inject(SessionService);

      return session.role() ? session.homeRoute() : '/auth';
    },
  },
  { path: 'auth', component: AuthGateComponent },
  {
    path: 'doctor',
    canActivate: [roleGuard('doctor')],
    children: [
      { path: '', component: DoctorOrdersComponent },
      { path: 'new', component: NewOrderComponent },
      { path: 'new/teeth', component: TeethPickerComponent },
      { path: 'orders/:id', component: DoctorOrderComponent },
    ],
  },
  {
    path: 'tech',
    canActivate: [roleGuard('technician')],
    children: [
      { path: '', component: TechOrdersComponent },
      { path: 'orders/:id', component: TechOrderComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
