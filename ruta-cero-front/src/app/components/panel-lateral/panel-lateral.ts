import { Component, inject, OnInit, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store, Lugar } from '../../services/store';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PerfilService } from '../../services/perfil.service';

@Component({
  selector: 'app-panel-lateral',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-lateral.html',
  styleUrl: './panel-lateral.css'
})
export class PanelLateral implements OnInit {
  private store = inject(Store);
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private perfil = inject(PerfilService);
  private router = inject(Router);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  vista = this.store.vistaActual;
  lugarSeleccionado = this.store.lugarSeleccionado;
  historial = this.store.historialChat;
  lugaresRecomendados = this.store.lugaresRecomendados;
  cargandoGooglePlaces = signal(false);
  mostrandoDefaults = signal(true);

  // Default places shown when no API data is available
  lugaresDefault: Lugar[] = [
    {
      id: 0,
      nombre: 'Café de la Vaca Centro',
      categoria: 'Cafetería',
      descripcion: 'Acogedora cafetería tradicional en el corazón del Centro Histórico, famosa por su café de altura y ambiente bohemio.',
      latitud: -0.2225,
      longitud: -78.5118,
      precio: '$',
      horario: '08:00 – 20:00'
    },
    {
      id: 1,
      nombre: 'Parque La Carolina',
      categoria: 'Parque',
      descripcion: 'El pulmón verde de Quito con 67 hectáreas de áreas verdes, lagunas artificiales, ciclovías y zonas deportivas.',
      latitud: -0.1807,
      longitud: -78.4818,
      precio: 'Gratis',
      horario: '05:00 – 18:00'
    },
    {
      id: 2,
      nombre: 'Teleférico de Quito',
      categoria: 'Mirador',
      descripcion: 'Sube a 4.053 msnm en el teleférico más alto de Sudamérica. Vista panorámica espectacular de todo el valle de Quito.',
      latitud: -0.1985,
      longitud: -78.5195,
      precio: '$$',
      horario: '09:00 – 17:00'
    },
    {
      id: 3,
      nombre: 'Basílica del Voto Nacional',
      categoria: 'Iglesia',
      descripcion: 'Imponente basílica neogótica, la más grande de América. Subir a sus torres ofrece una vista única del Centro Histórico.',
      latitud: -0.2157,
      longitud: -78.5073,
      precio: '$',
      horario: '09:00 – 17:00'
    },
    {
      id: 4,
      nombre: 'Museo de la Ciudad',
      categoria: 'Museo',
      descripcion: 'Recorrido interactivo por la historia de Quito desde sus orígenes precolombinos hasta la actualidad, en una casona del siglo XVI.',
      latitud: -0.2200,
      longitud: -78.5120,
      precio: '$',
      horario: '09:30 – 17:30'
    }
  ];

  procesandoMensaje = false;
  guardandoItinerario = false;

  miLatitud: number | null = null;
  miLongitud: number | null = null;

  // Map from category → gradient for card image placeholders
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

  ngOnInit() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          this.miLatitud = posicion.coords.latitude;
          this.miLongitud = posicion.coords.longitude;
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }

  // Cargar lugares de Google Places cuando se abre Descubrir
  async cargarGooglePlaces() {
    if (this.cargandoGooglePlaces() || this.lugaresRecomendados().length > 0) return;
    if (this.miLatitud === null || this.miLongitud === null) return;

    this.cargandoGooglePlaces.set(true);
    try {
      // Cargar un par de categorías clave en paralelo
      const categorias = ['Cafetería', 'Parque', 'Museo'];
      const resultados = await Promise.all(
        categorias.map(cat => this.perfil.obtenerLugaresGoogle(cat, this.miLatitud!, this.miLongitud!, 5000).toPromise())
      );

      const lugaresGoogle = resultados
        .flatMap(r => r?.lugares || [])
        .filter((l, i, arr) => arr.findIndex(x => x.id === l.id) === i) // deduplicar por id
        .slice(0, 10);

      if (lugaresGoogle.length > 0) {
        this.mostrandoDefaults.set(false);
        this.store.lugaresRecomendados.set(lugaresGoogle as any);
      }
    } catch (err) {
      console.warn('No se pudieron cargar lugares de Google Places:', err);
    } finally {
      this.cargandoGooglePlaces.set(false);
    }
  }

  cambiarVista(nuevaVista: 'descubrir' | 'chat' | 'detalle') {
    this.store.vistaActual.set(nuevaVista);
    // Al ir a Descubrir, intentar cargar Google Places si no hay recomendaciones reales
    if (nuevaVista === 'descubrir' && this.lugaresRecomendados().length === 0) {
      setTimeout(() => this.cargarGooglePlaces(), 100);
    }
  }

  irAPerfil() {
    this.router.navigate(['/perfil']);
  }

  logout() {
    this.auth.logout();
  }

  irAAdmin() {
    this.router.navigate(['/admin']);
  }

  seleccionarLugar(lugar: Lugar) {
    this.store.lugarSeleccionado.set(lugar);
    this.store.vistaActual.set('detalle');
  }

  usarDefaultLugares(): Lugar[] {
    return this.lugaresDefault;
  }

  centrarMapa(lugar: Lugar) {
    this.store.lugarSeleccionado.set(lugar);
    this.store.vistaActual.set('descubrir');
  }

  getCategoryGradient(categoria?: string): string {
    return this.categoryGradients[categoria || ''] || 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #5eead4 100%)';
  }

  getCategoryIcon(categoria?: string): string {
    return this.categoryIcons[categoria || ''] || '📍';
  }

  sugerirCategoria(categoria: string) {
    const mensaje = `Muéstrame lugares de tipo "${categoria}" en Quito`;
    this.cambiarVista('chat');
    setTimeout(() => {
      this.enviarTextoDirecto(mensaje);
    }, 100);
  }

  preguntarPorLugar(lugar: Lugar) {
    const mensaje = `Cuéntame más sobre ${lugar.nombre} en Quito`;
    this.cambiarVista('chat');
    setTimeout(() => {
      this.enviarTextoDirecto(mensaje);
    }, 100);
  }

  private enviarTextoDirecto(texto: string) {
    this.historial.update(h => [...h, { emisor: 'usuario', texto }]);
    this.procesandoMensaje = true;
    this.llamarBackend(texto, this.miLatitud, this.miLongitud);
  }

  enviarMensaje(texto: string, inputElement: HTMLInputElement) {
    if (!texto.trim() || this.procesandoMensaje) return;
    inputElement.value = '';
    this.enviarTextoDirecto(texto.trim());
  }

  private llamarBackend(texto: string, lat: number | null, lng: number | null) {
    const payload = { mensaje: texto, lat, lng, historial: this.historial() };

    this.api.post<any>('/api/chat', payload).subscribe({
      next: (res) => {
        const textoDelServidor = res?.respuesta || 'Recibí los datos...';
        this.historial.update(h => [...h, { emisor: 'bot', texto: textoDelServidor }]);

        if (res.lugaresFisicos && res.lugaresFisicos.length > 0) {
          this.mostrandoDefaults.set(false);
          const lugaresConNumeros = res.lugaresFisicos.map((lugar: any) => ({
            ...lugar,
            latitud: Number(lugar.latitud),
            longitud: Number(lugar.longitud)
          }));
          this.store.lugaresRecomendados.set(lugaresConNumeros as any);
        } else {
          this.mostrandoDefaults.set(false);
          this.store.lugaresRecomendados.set([]);
        }

        this.procesandoMensaje = false;
        setTimeout(() => this.scrollAlFinal(), 50);
      },
      error: () => {
        this.historial.update(h => [...h, { emisor: 'bot', texto: 'Upps, no pude conectar con el servidor.' }]);
        this.procesandoMensaje = false;
      }
    });
  }

  private scrollAlFinal() {
    try {
      this.messagesContainer?.nativeElement?.scrollTo({
        top: this.messagesContainer.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    } catch {}
  }

  async guardarItinerarioActual() {
    const lugares = this.lugaresRecomendados();
    if (!lugares || lugares.length === 0) return;

    const nombre = prompt('¿Cómo quieres llamar a este itinerario?', 'Mi plan');
    if (!nombre?.trim()) return;

    this.guardandoItinerario = true;
    try {
      const lugaresIds = lugares.map(l => l.id).filter((id): id is number => id != null);
      await this.perfil.guardarItinerario({ nombre: nombre.trim(), descripcion: null, lugaresIds }).toPromise();
      alert('¡Itinerario guardado! Lo verás en tu perfil.');
    } catch (err: any) {
      alert(err.error?.error || 'Error al guardar el itinerario');
    } finally {
      this.guardandoItinerario = false;
    }
  }

  formatearMensaje(texto: string): string {
    if (!texto) return '';
    let html = texto;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  truncarDescripcion(desc: string | null | undefined, max: number): string {
    if (!desc) return '';
    return desc.length > max ? desc.slice(0, max) + '...' : desc;
  }
}