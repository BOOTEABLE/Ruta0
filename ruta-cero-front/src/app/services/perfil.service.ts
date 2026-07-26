import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PreferenciasUsuario {
  categoriasFavoritas: string[];
  categoriasEvitadas: string[];
  presupuestoMinimo?: string;
  presupuestoMaximo?: string;
}

export interface Itinerario {
  id: number;
  nombre: string;
  descripcion: string | null;
  lugaresIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ItinerarioConLugares extends Itinerario {
  lugares: Lugar[];
}

export interface Lugar {
  id: number;
  nombre: string;
  categoria: string;
  precio: string | null;
  descripcion: string | null;
  latitud: number | string;
  longitud: number | string;
  ubicacion?: any;
  horario: string | null;
  confianza: number | null;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

  // Preferencias
  obtenerPreferencias() {
    return this.http.get<{ preferencias: PreferenciasUsuario }>(`${this.API}/perfil/preferencias`);
  }

  actualizarPreferencias(data: PreferenciasUsuario) {
    return this.http.put<{ preferencias: PreferenciasUsuario }>(`${this.API}/perfil/preferencias`, data);
  }

  // Itinerarios
  listarItinerarios() {
    return this.http.get<{ itinerarios: Itinerario[] }>(`${this.API}/perfil/itinerarios`);
  }

  obtenerItinerario(id: number) {
    return this.http.get<{ itinerario: ItinerarioConLugares }>(`${this.API}/perfil/itinerarios/${id}`);
  }

  guardarItinerario(data: { nombre: string; descripcion: string | null; lugaresIds: number[] }) {
    return this.http.post<{ itinerario: Itinerario }>(`${this.API}/perfil/itinerarios`, data);
  }

  actualizarItinerario(id: number, data: Partial<{ nombre: string; descripcion: string | null; lugaresIds: number[] }>) {
    return this.http.put<{ itinerario: Itinerario }>(`${this.API}/perfil/itinerarios/${id}`, data);
  }

  eliminarItinerario(id: number) {
    return this.http.delete<{ message: string }>(`${this.API}/perfil/itinerarios/${id}`);
  }

  // Recomendaciones
  obtenerRecomendaciones(lat: number, lng: number, radio?: number) {
    const params = new URLSearchParams();
    params.set('lat', lat.toString());
    params.set('lng', lng.toString());
    if (radio) params.set('radio', radio.toString());
    return this.http.get<{ respuesta: string; lugaresFisicos: Lugar[] }>(`${this.API}/perfil/recomendaciones?${params}`);
  }
}