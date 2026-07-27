import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// 👈 AUTH GUARD - Usuarios autenticados
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  console.log('🔍 authGuard - Verificando autenticación...');
  console.log('🔍 authGuard - isAuthenticated:', auth.isAuthenticated());
  
  if (auth.isAuthenticated()) {
    console.log('✅ authGuard - Usuario autenticado');
    return true;
  }
  
  console.log('❌ authGuard - Usuario no autenticado, redirigiendo a /login');
  router.navigate(['/login']);
  return false;
};

// 👈 GUEST GUARD - Solo para usuarios NO autenticados (login, register)
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  console.log('🔍 guestGuard - Verificando...');
  console.log('🔍 guestGuard - isAuthenticated:', auth.isAuthenticated());
  
  if (!auth.isAuthenticated()) {
    console.log('✅ guestGuard - Usuario no autenticado, acceso permitido');
    return true;
  }
  
  console.log('❌ guestGuard - Usuario autenticado, redirigiendo a /');
  router.navigate(['/']);
  return false;
};

// 👈 ADMIN GUARD - Solo para administradores
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  const user = auth.currentUser();
  
  console.log('🔍 adminGuard - Verificando acceso...');
  console.log('🔍 adminGuard - Usuario:', user);
  console.log('🔍 adminGuard - Rol:', user?.rol);
  console.log('🔍 adminGuard - Es admin?', user?.rol === 'admin');
  
  if (auth.isAuthenticated() && auth.isAdmin()) {
    console.log('✅ adminGuard - Acceso permitido');
    return true;
  }
  
  console.log('❌ adminGuard - Acceso denegado, redirigiendo a /');
  router.navigate(['/']);
  return false;
};