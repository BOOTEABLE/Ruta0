import { Component, inject, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store, Mensaje, Lugar } from '../../services/store';
import { ApiService } from '../../services/api.service';
import { FavoritosService } from '../../services/favoritos.service';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-view.html',
  styleUrl: './chat-view.css',
})
export class ChatView {
  private store = inject(Store);
  private api = inject(ApiService);
  private router = inject(Router);
  private favoritosSvc = inject(FavoritosService);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  historial = this.store.historialChat;
  lugaresRecomendados = this.store.lugaresRecomendados;
  procesandoMensaje = false;
  destacando = false;

  private miLatitud: number | null = null;
  private miLongitud: number | null = null;

  private lugaresDefault: Lugar[] = [
    { id: 0, nombre: 'Café de la Vaca Centro', categoria: 'Cafetería', descripcion: 'Acogedora cafetería tradicional en el corazón del Centro Histórico.', latitud: -0.2225, longitud: -78.5118, precio: '$', horario: '08:00 – 20:00' },
    { id: 1, nombre: 'Parque La Carolina', categoria: 'Parque', descripcion: 'El pulmón verde de Quito con 67 hectáreas de áreas verdes.', latitud: -0.1807, longitud: -78.4818, precio: 'Gratis', horario: '05:00 – 18:00' },
    { id: 2, nombre: 'Teleférico de Quito', categoria: 'Mirador', descripcion: 'Sube a 4.053 msnm en el teleférico más alto de Sudamérica.', latitud: -0.1985, longitud: -78.5195, precio: '$$', horario: '09:00 – 17:00' },
    { id: 3, nombre: 'Basílica del Voto Nacional', categoria: 'Iglesia', descripcion: 'Imponente basílica neogótica, la más grande de América.', latitud: -0.2157, longitud: -78.5073, precio: '$', horario: '09:00 – 17:00' },
    { id: 4, nombre: 'Museo de la Ciudad', categoria: 'Museo', descripcion: 'Recorrido interactivo por la historia de Quito.', latitud: -0.2200, longitud: -78.5120, precio: '$', horario: '09:30 – 17:30' },
  ];

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.miLatitud = pos.coords.latitude;
          this.miLongitud = pos.coords.longitude;
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }

  private extraerLugaresDelTexto(texto: string): any[] {
    const lines = texto.split('\n');
    const nombresExtraidos: string[] = [];
    const regex = /^\d+[\.\)]\s+(.+?)(?:\s*[-–—]\s*|$)/;
    for (const line of lines) {
      const match = line.trim().match(regex);
      if (match) nombresExtraidos.push(match[1].trim());
    }
    if (nombresExtraidos.length === 0) return [];
    const lowerNames = nombresExtraidos.map(n => n.toLowerCase());
    return this.lugaresDefault.filter(d =>
      lowerNames.some(n => d.nombre.toLowerCase().includes(n) || n.includes(d.nombre.toLowerCase()))
    );
  }

  enviarMensaje(texto: string, input: HTMLInputElement) {
    if (!texto?.trim() || this.procesandoMensaje) return;
    input.value = '';
    this.procesandoMensaje = true;

    this.historial.update((h) => [...h, { emisor: 'usuario', texto: texto.trim() }]);
    this.historial.update((h) => [...h, { emisor: 'bot', texto: '', pensando: true }]);

    const payload = {
      mensaje: texto.trim(),
      lat: this.miLatitud,
      lng: this.miLongitud,
      historial: this.historial(),
    };

    this.api.post<any>('/api/chat', payload).subscribe({
      next: (res) => {
        const respuesta = res?.respuesta || 'Recibí los datos...';

        let lugares: any[] = (res.lugaresFisicos || []);
        if (lugares.length === 0) {
          lugares = this.extraerLugaresDelTexto(respuesta);
        }

        const lugaresFinales = lugares.map((l: any) => ({
          ...l,
          latitud: Number(l.latitud),
          longitud: Number(l.longitud),
        }));

        this.historial.update((h) => {
          const sinPensando = h.filter((m) => !m.pensando);
          return [...sinPensando, {
            emisor: 'bot',
            texto: respuesta,
            lugares: lugaresFinales.length > 0 ? lugaresFinales : undefined,
          }];
        });

        if (lugaresFinales.length > 0) {
          this.store.lugaresRecomendados.set(lugaresFinales);
        } else {
          this.store.lugaresRecomendados.set([]);
        }

        this.procesandoMensaje = false;
        setTimeout(() => this.scrollAlFinal(), 50);
      },
      error: () => {
        this.historial.update((h) => {
          const sinPensando = h.filter((m) => !m.pensando);
          return [...sinPensando, { emisor: 'bot', texto: 'Upps, no pude conectar con el servidor.' }];
        });
        this.procesandoMensaje = false;
      },
    });
  }

  centrarMapa(lugar: any) {
    if (lugar) {
      this.store.lugaresRecomendados.set([lugar]);
      this.store.seccionSidebar.set('mapa');
      this.router.navigate(['/']);
    }
  }

  verLugarEnMapa(lugar: any, event: Event) {
    event.stopPropagation();
    this.centrarMapa(lugar);
  }

  async destacarLugar(lugar: any) {
    if (!lugar) return;
    this.destacando = true;
    try {
      const destacados = await this.favoritosSvc.getMisDestacados().toPromise();
      if (destacados?.destacados?.some((d: any) => d.nombre === lugar.nombre)) return;
      await this.favoritosSvc.createDestacado({
        nombre: lugar.nombre,
        categoria: lugar.categoria || 'General',
        descripcion: lugar.descripcion || '',
        latitud: Number(lugar.latitud),
        longitud: Number(lugar.longitud),
        direccion: lugar.direccion || '',
        horario: lugar.horario || '',
        precio: lugar.precio || '',
        imagen_url: lugar.photoUrl || '',
      }).toPromise();
    } catch {}
    finally { this.destacando = false; }
  }

  seleccionarLugar(lugar: Lugar) {
    this.store.lugarSeleccionado.set(lugar);
    this.store.vistaActual.set('detalle');
  }

  private categoryGradients: Record<string, string> = {
    'Cafetería': 'linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #DEB887 100%)',
    'Restaurante': 'linear-gradient(135deg, #c0392b 0%, #e67e22 50%, #f39c12 100%)',
    'Parque': 'linear-gradient(135deg, #14532d 0%, #2e7d32 50%, #66bb6a 100%)',
    'Museo': 'linear-gradient(135deg, #1a1a2e 0%, #4a148c 50%, #7b1fa2 100%)',
    'Iglesia': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d8b4fe 100%)',
    'Mirador': 'linear-gradient(135deg, #1e3a5f 0%, #0284c7 50%, #38bdf8 100%)',
    'Centro Comercial': 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #94a3b8 100%)',
    'Teatro': 'linear-gradient(135deg, #881337 0%, #be123c 50%, #fb7185 100%)',
    'Mercado': 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #fbbf24 100%)',
  };

  private categoryIcons: Record<string, string> = {
    'Cafetería': '☕',
    'Restaurante': '🍽️',
    'Parque': '🌳',
    'Museo': '🏛️',
    'Iglesia': '⛪',
    'Mirador': '🏔️',
    'Centro Comercial': '🛍️',
    'Teatro': '🎭',
    'Mercado': '🧺',
  };

  getCategoryGradient(categoria?: string): string {
    return this.categoryGradients[categoria || ''] || 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #5eead4 100%)';
  }

  getCategoryIcon(categoria?: string): string {
    return this.categoryIcons[categoria || ''] || '📍';
  }

  truncarDescripcion(desc: string | null | undefined, max: number): string {
    if (!desc) return '';
    return desc.length > max ? desc.slice(0, max) + '...' : desc;
  }

  formatearMensaje(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  private scrollAlFinal() {
    try {
      this.messagesContainer?.nativeElement?.scrollTo({
        top: this.messagesContainer.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    } catch {}
  }
}
