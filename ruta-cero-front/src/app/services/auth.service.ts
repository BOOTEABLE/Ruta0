import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'user' | 'admin';
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
  private API = 'http://localhost:3000/api';

  currentUser = signal<Usuario | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.rol === 'admin');

  constructor() {
    this.cargarSesion();
  }

  private cargarSesion() {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUser.set(JSON.parse(user));
    }
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: Usuario }>(`${this.API}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  registro(nombre: string, email: string, password: string, confirmarPassword: string) {
    return this.http.post<{ token: string; user: Usuario }>(`${this.API}/auth/register`, {
      nombre, email, password, confirmarPassword
    }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  actualizarUsuario(usuario: Usuario) {
    localStorage.setItem('user', JSON.stringify(usuario));
    this.currentUser.set(usuario);
  }
}
