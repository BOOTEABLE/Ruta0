import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from './store';
import { Observable, tap } from 'rxjs';

const API = 'http://localhost:3000/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private store = inject(Store);
  private router = inject(Router);

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${API}/login`, { email, password }).pipe(
      tap(res => this.guardarSesion(res))
    );
  }

  register(nombre: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${API}/register`, { nombre, email, password }).pipe(
      tap(res => this.guardarSesion(res))
    );
  }

  cargarPerfil(): Observable<any> {
    return this.http.get<any>(`${API}/me`).pipe(
      tap(res => this.store.usuario.set(res.usuario))
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.store.usuario.set(null);
    this.store.token.set(null);
    this.router.navigate(['/login']);
  }

  private guardarSesion(res: any) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('usuario', JSON.stringify(res.usuario));
    this.store.usuario.set(res.usuario);
    this.store.token.set(res.token);
    this.router.navigate(['/dashboard']);
  }

  obtenerToken(): string | null {
    try { return localStorage.getItem('token'); } catch { return null; }
  }

  haySesion(): boolean {
    return !!this.obtenerToken();
  }
}
