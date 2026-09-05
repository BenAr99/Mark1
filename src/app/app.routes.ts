import { Routes } from '@angular/router';
import { OrdersComponent } from './orders/orders.component';
import { NewOrderComponent } from './orders/new-order/new-order.component';

export const routes: Routes = [
  { path: '', component: OrdersComponent },
  { path: 'new-order', component: NewOrderComponent },
];
