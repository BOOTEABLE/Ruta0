import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol?: 'user' | 'admin';
  onboardingCompletado?: boolean;
  preferencias?: {
    tema: 'light' | 'dark';
    tamanoFuente: 'normal' | 'grande' | 'extra-grande';
    categoriasFavoritas: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private API = environment.apiUrl;

  currentUser = signal<Usuario | null>(null);
  
  isAuthenticated = computed(() => {
    const user = this.currentUser();
    return !!user;
  });
  
  // 👈 CORREGIDO: isAdmin como computed normal
  isAdmin = computed(() => {
    const user = this.currentUser();
    console.log('🔍 isAdmin - Usuario actual:', user);
    console.log('🔍 isAdmin - Rol:', user?.rol);
    console.log('🔍 isAdmin - Comparación:', user?.rol === 'admin');
    return user?.rol === 'admin';
  });
  
  hasCompletedOnboarding = computed(() => {
    const user = this.currentUser();
    return !!user?.onboardingCompletado;
  });

  constructor() {
    console.log('🔵 AuthService constructor ejecutado');
    this.cargarSesion();
  }

  private cargarSesion() {
    console.log('🔵 cargarSesion() ejecutado');
    if (typeof window === 'undefined') {
      console.log('🔵 Ejecutando en servidor, saltando carga de sesión');
      return;
    }
    
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    console.log('🔵 Token en localStorage:', token ? '✅ Presente' : '❌ No encontrado');
    console.log('🔵 User en localStorage:', user ? '✅ Presente' : '❌ No encontrado');
    
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        console.log('🔵 Usuario cargado de localStorage:', parsedUser);
        console.log('🔵 Rol del usuario cargado:', parsedUser?.rol);
        this.currentUser.set(parsedUser);
        console.log('🔵 currentUser actualizado:', this.currentUser());
        console.log('🔵 isAdmin después de cargar:', this.isAdmin());
      } catch (error) {
        console.error('❌ Error parseando usuario de localStorage:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('🔵 No hay sesión guardada en localStorage');
    }
  }

login(email: string, password: string) {
    console.log('🔵 FRONTEND - Intentando login:', email);
    
    return this.http.post<{ token: string; user: Usuario }>(
        `${this.API}/auth/login`, 
        { email, password }
    ).pipe(
        tap({
            next: (res) => {
                console.log('🔍 FRONTEND - Respuesta del login:', res);
                console.log('🔍 FRONTEND - Rol del usuario:', res.user?.rol);
                
                localStorage.setItem('access_token', res.token);
                localStorage.setItem('user', JSON.stringify(res.user));
                this.currentUser.set(res.user);
                
                console.log('✅ FRONTEND - isAdmin:', this.isAdmin());
                
                // 👈 Redirigir según el rol
                if (res.user?.rol === 'admin') {
                    console.log('🟢 FRONTEND - Admin - Redirigiendo a /admin');
                    this.router.navigate(['/admin']);
                } else if (res.user?.onboardingCompletado) {
                    console.log('🔵 FRONTEND - Usuario con onboarding - Redirigiendo a /');
                    this.router.navigate(['/']);
                } else {
                    console.log('🟡 FRONTEND - Usuario sin onboarding - Redirigiendo a /onboarding');
                    this.router.navigate(['/onboarding']);
                }
            },
            error: (err) => {
                console.error('❌ FRONTEND - Error en login:', err);
            }
        })
    );
}

  registro(nombre: string, email: string, password: string, confirmarPassword: string) {
    console.log('🔵 FRONTEND - Intentando registro:', email);
    
    return this.http.post<{ token: string; user: Usuario }>(
      `${this.API}/auth/register`,
      { nombre, email, password, confirmarPassword }
    ).pipe(
      tap({
        next: (res) => {
          console.log('🔍 FRONTEND - Registro exitoso:', res);
          localStorage.setItem('access_token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
          console.log('✅ FRONTEND - Usuario registrado y logueado');
        },
        error: (err) => {
          console.error('❌ FRONTEND - Error en registro:', err);
        }
      })
    );
  }

  logout() {
    console.log('🔵 FRONTEND - Cerrando sesión');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  actualizarUsuario(usuario: Usuario) {
    console.log('🔵 FRONTEND - Actualizando usuario:', usuario);
    localStorage.setItem('user', JSON.stringify(usuario));
    this.currentUser.set(usuario);
  }

  actualizarPreferencias(prefs: { categoriasFavoritas: string[]; categoriasEvitadas: string[]; presupuestoMinimo?: string }) {
    return this.http.put<{ preferencias: any }>(`${this.API}/perfil/preferencias`, prefs);
  }

  checkOnboardingStatus() {
    return this.http.get<{ onboardingCompletado: boolean }>(`${this.API}/perfil/onboarding-status`);
  }

completeOnboarding() {
    return this.http.post<{ user: Usuario; onboardingCompletado: boolean }>(
        `${this.API}/perfil/onboarding-complete`, 
        {}
    ).pipe(
        tap({
            next: (res) => {
                console.log('🔍 FRONTEND - Onboarding completado - Respuesta:', res);
                console.log('🔍 FRONTEND - user en respuesta:', res.user);
                console.log('🔍 FRONTEND - rol en respuesta:', res.user?.rol);
                
                // 👈 OBTENER EL USUARIO ACTUAL PARA MANTENER EL ROL
                const currentUser = this.currentUser();
                console.log('🔍 FRONTEND - Usuario actual (antes de actualizar):', currentUser);
                console.log('🔍 FRONTEND - Rol actual:', currentUser?.rol);
                
                // 👈 COMBINAR: tomar el rol del usuario actual si no viene en la respuesta
                const updatedUser = { 
                    ...res.user, 
                    onboardingCompletado: true,
                    rol: res.user?.rol || currentUser?.rol || 'user' // 👈 MANTENER ROL
                };
                
                console.log('🔍 FRONTEND - Usuario actualizado:', updatedUser);
                console.log('🔍 FRONTEND - Rol mantenido:', updatedUser.rol);
                
                this.currentUser.set(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                console.log('✅ FRONTEND - Onboarding completado y usuario actualizado');
            },
            error: (err) => {
                console.error('❌ FRONTEND - Error completando onboarding:', err);
            }
        })
    );
  }
}