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
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.rol === 'admin');
  hasCompletedOnboarding = computed(() => !!this.currentUser()?.onboardingCompletado);

  constructor() {
    this.cargarSesion();
  }

  private cargarSesion() {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUser.set(JSON.parse(user));
    }
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: Usuario }>(`${this.API}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  registro(nombre: string, email: string, password: string, confirmarPassword: string) {
    return this.http.post<{ token: string; user: Usuario }>(`${this.API}/auth/register`, {
      nombre,
      email,
      password,
      confirmarPassword
    }).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  logout() {
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
    return this.http.post<{ user: Usuario; onboardingCompletado: boolean }>(`${this.API}/perfil/onboarding-complete`, {}).pipe(
      tap(res => {
        this.currentUser.set(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
      })
    );
  }
}