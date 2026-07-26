import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { OnboardingComponent } from './components/onboarding/onboarding';
import { PerfilComponent } from './components/perfil/perfil';
import { ItinerarioDetalleComponent } from './components/itinerario-detalle/itinerario-detalle';
import { authGuard, guestGuard } from './guards/auth.guard';
import { onboardingGuard } from './guards/onboarding.guard';

export const routes: Routes = [
  {
    path: 'onboarding',
    component: OnboardingComponent,
    canActivate: [authGuard]  // Solo usuarios autenticados (sin onboardingGuard para permitir acceso)
  },
  {
    path: 'perfil',
    component: PerfilComponent,
    canActivate: [authGuard, onboardingGuard]
  },
  {
    path: 'itinerario/:id',
    component: ItinerarioDetalleComponent,
    canActivate: [authGuard, onboardingGuard]
  },
  {
    path: '',
    component: DashboardComponent,
    canActivate: [authGuard, onboardingGuard]
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [guestGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];