import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Destacado } from './admin.service';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

  getMisDestacados() {
    return this.http.get<{ destacados: Destacado[] }>(`${this.API}/admin/destacados/mis`);
  }

  createDestacado(data: Partial<Destacado>) {
    return this.http.post<{ mensaje: string; destacado: Destacado }>(
      `${this.API}/admin/destacados`,
      data
    );
  }

  deleteDestacado(id: number) {
    return this.http.delete<{ mensaje: string }>(
      `${this.API}/admin/destacados/${id}`
    );
  }
}
