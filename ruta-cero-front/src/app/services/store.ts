import { Injectable, signal } from '@angular/core';

export interface Lugar {
  id?: number;
  nombre: string;
  categoria: string;
  latitud: number;
  longitud: number;
  descripcion: string;
  horario?: string;
  precio?: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  preferencias?: string[];
  avatar_url?: string;
  creado_en?: string;
}

export interface Mensaje {
  emisor: 'usuario' | 'bot';
  texto: string;
}

@Injectable({
  providedIn: 'root'
})
export class Store {
  lugarSeleccionado = signal<Lugar | null>(null);
  lugaresRecomendados = signal<Lugar[]>([]);
  vistaActual = signal<'descubrir' | 'chat' | 'detalle'>('descubrir');

  usuario = signal<Usuario | null>(null);
  token = signal<string | null>(null);

  historialChat = signal<Mensaje[]>([
    { emisor: 'bot', texto: '🤖 ¡Hola! Cuéntame: ¿Cuánto presupuesto o tiempo tienes para tu salida hoy en Quito?' }
  ]);

  restaurarSesion() {
    try {
      const token = localStorage.getItem('token');
      const data = localStorage.getItem('usuario');
      if (token) this.token.set(token);
      if (data) this.usuario.set(JSON.parse(data));
    } catch {
      // Ignorar durante SSR
    }
  }
}