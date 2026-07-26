import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get<T>(path: string) {
    return this.http.get<T>(path);
  }

  post<T>(path: string, body: any) {
    return this.http.post<T>(path, body);
  }

  put<T>(path: string, body: any) {
    return this.http.put<T>(path, body);
  }

  delete<T>(path: string) {
    return this.http.delete<T>(path);
  }
}