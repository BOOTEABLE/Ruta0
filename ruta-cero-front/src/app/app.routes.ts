import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
