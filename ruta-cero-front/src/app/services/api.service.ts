import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private API = 'http://localhost:3000/api';

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  get<T>(path: string) {
    return this.http.get<T>(`${this.API}${path}`, { headers: this.getHeaders() });
  }

  post<T>(path: string, body: any) {
    return this.http.post<T>(`${this.API}${path}`, body, { headers: this.getHeaders() });
  }

  put<T>(path: string, body: any) {
    return this.http.put<T>(`${this.API}${path}`, body, { headers: this.getHeaders() });
  }

  delete<T>(path: string) {
    return this.http.delete<T>(`${this.API}${path}`, { headers: this.getHeaders() });
  }
}
