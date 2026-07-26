import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const onboardingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Permitir acceso a /onboarding sin verificar onboarding completado
  // (el guard se usa en rutas que REQUIEREN onboarding completado)
  if (auth.hasCompletedOnboarding()) {
    return true;
  }

  router.navigate(['/onboarding']);
  return false;
};