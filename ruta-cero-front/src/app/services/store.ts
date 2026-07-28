import { Injectable, signal } from '@angular/core';

export interface Lugar {
  id?: number | string;
  nombre: string;
  categoria: string;
  latitud: number | string;
  longitud: number | string;
  descripcion: string;
  horario?: string;
  precio?: string;
  photoUrl?: string;
  rating?: number;
  source?: string;
}

export interface Mensaje {
  emisor: 'usuario' | 'bot';
  texto: string;
  lugares?: any[];
  pensando?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Store {
  lugarSeleccionado = signal<Lugar | null>(null);
  lugaresRecomendados = signal<Lugar[]>([]);
  vistaActual = signal<'descubrir' | 'chat' | 'detalle'>('descubrir');
  seccionSidebar = signal<'mapa' | 'chat' | 'rutas' | 'favoritos' | 'historial' | 'configuracion'>('mapa');
  
  // 2. NUEVO: Agregamos la memoria del chat con un saludo inicial
  historialChat = signal<Mensaje[]>([
    { emisor: 'bot', texto: '🤖 ¡Hola! Cuéntame: ¿Cuánto presupuesto o tiempo tienes para tu salida hoy en Quito?' }
  ]);
}