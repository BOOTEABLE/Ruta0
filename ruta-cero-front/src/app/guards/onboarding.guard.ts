import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const onboardingGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    
    const user = auth.currentUser();
    
    console.log('🔍 onboardingGuard - Usuario:', user);
    console.log('🔍 onboardingGuard - Rol:', user?.rol);
    console.log('🔍 onboardingGuard - Onboarding completado:', user?.onboardingCompletado);
    
    // 👈 SI ES ADMIN, SALTAR ONBOARDING COMPLETAMENTE
    if (user?.rol === 'admin') {
        console.log('🟢 onboardingGuard - Admin detectado, saltando onboarding');
        return true;
    }
    
    // Si el usuario ya completó onboarding, continuar
    if (user?.onboardingCompletado) {
        console.log('🟢 onboardingGuard - Onboarding completado');
        return true;
    }
    
    // Si no ha completado onboarding, redirigir
    console.log('🔵 onboardingGuard - Redirigiendo a onboarding');
    router.navigate(['/onboarding']);
    return false;
};