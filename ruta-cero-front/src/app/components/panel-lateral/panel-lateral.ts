import { Component, inject, OnInit, ElementRef, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store, Lugar } from '../../services/store';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PerfilService, Itinerario, ItinerarioConLugares } from '../../services/perfil.service';
import { AdminService, Destacado } from '../../services/admin.service';

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
  private admin = inject(AdminService);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  vista = this.store.vistaActual;
  lugarSeleccionado = this.store.lugarSeleccionado;
  historial = this.store.historialChat;
  lugaresRecomendados = this.store.lugaresRecomendados;
  cargandoGooglePlaces = signal(false);
  mostrandoDefaults = signal(true);

  seccion = this.store.seccionSidebar;
  favoritos = signal<Destacado[]>([]);
  itinerarios = signal<Itinerario[]>([]);
  cargandoFavoritos = false;
  cargandoItinerarios = false;
  itinerarioExpandido = signal<number | null>(null);
  itinerarioDetalle = signal<ItinerarioConLugares | null>(null);
  cargandoDetalle = signal(false);

  constructor() {
    effect(() => {
      const sec = this.seccion();
      if (sec === 'favoritos') this.cargarFavoritos();
      else if (sec === 'historial' || sec === 'rutas') this.cargarItinerarios();
      else if (sec === 'chat') setTimeout(() => this.scrollAlFinal(), 100);
    });
  }

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
  destacando = false; // 👈 AGREGAR ESTA VARIABLE

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
      const categorias = ['Cafetería', 'Parque', 'Museo'];
      const resultados = await Promise.all(
        categorias.map(cat => this.perfil.obtenerLugaresGoogle(cat, this.miLatitud!, this.miLongitud!, 5000).toPromise())
      );

      const lugaresGoogle = resultados
        .flatMap(r => r?.lugares || [])
        .filter((l, i, arr) => arr.findIndex(x => x.id === l.id) === i)
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
    if (nuevaVista === 'descubrir' && this.lugaresRecomendados().length === 0) {
      setTimeout(() => this.cargarGooglePlaces(), 100);
    }
  }

  modoOscuro = localStorage.getItem('modoOscuro') === 'true';
  altoContraste = localStorage.getItem('altoContraste') === 'true';

  toggleModoOscuro() {
    this.modoOscuro = !this.modoOscuro;
    document.documentElement.classList.toggle('dark-mode', this.modoOscuro);
    localStorage.setItem('modoOscuro', String(this.modoOscuro));
  }

  toggleAltoContraste() {
    this.altoContraste = !this.altoContraste;
    document.documentElement.classList.toggle('alto-contraste', this.altoContraste);
    localStorage.setItem('altoContraste', String(this.altoContraste));
  }

  logout() {
    this.auth.logout();
  }

  private async cargarFavoritos() {
    this.cargandoFavoritos = true;
    try {
      const res = await this.admin.getMisDestacados().toPromise();
      this.favoritos.set(res?.destacados || []);
    } catch {
      this.favoritos.set([]);
    } finally {
      this.cargandoFavoritos = false;
    }
  }

  private async cargarItinerarios() {
    this.cargandoItinerarios = true;
    try {
      const res = await this.perfil.listarItinerarios().toPromise();
      this.itinerarios.set(res?.itinerarios || []);
    } catch {
      this.itinerarios.set([]);
    } finally {
      this.cargandoItinerarios = false;
    }
  }

  toggleItinerario(it: Itinerario) {
    if (this.itinerarioExpandido() === it.id) {
      this.itinerarioExpandido.set(null);
      this.itinerarioDetalle.set(null);
      return;
    }

    this.cargandoDetalle.set(true);
    this.perfil.obtenerItinerario(it.id).subscribe({
      next: (res) => {
        this.itinerarioDetalle.set(res.itinerario);
        this.itinerarioExpandido.set(it.id);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.cargandoDetalle.set(false);
      }
    });
  }

  verEnMapa(itinerario: ItinerarioConLugares, event: Event) {
    event.stopPropagation();
    if (itinerario.lugares && itinerario.lugares.length > 0) {
      sessionStorage.setItem('itinerarioActivo', JSON.stringify(itinerario));
      this.router.navigate(['/']);
    }
  }

  eliminarItinerario(id: number, event: Event) {
    event.stopPropagation();
    if (!confirm('¿Eliminar este itinerario?')) return;

    this.perfil.eliminarItinerario(id).subscribe({
      next: () => {
        this.itinerarios.update(arr => arr.filter(i => i.id !== id));
        if (this.itinerarioExpandido() === id) {
          this.itinerarioExpandido.set(null);
          this.itinerarioDetalle.set(null);
        }
      },
      error: () => {}
    });
  }

  eliminarDestacado(id: number, event: Event) {
    event.stopPropagation();
    if (!confirm('¿Eliminar este lugar de tus destacados?')) return;

    this.admin.deleteDestacado(id).subscribe({
      next: () => {
        this.favoritos.update(list => list.filter(item => item.id !== id));
      },
      error: () => {}
    });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  repetirConsulta(texto: string) {
    this.store.seccionSidebar.set('chat');
    this.sugerirCategoria(texto.replace(/^.*"(.*)".*$/, '$1'));
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

  centrarMapa(lugar: Lugar | null) {
    if (lugar) {
        this.store.lugarSeleccionado.set(lugar);
        this.store.vistaActual.set('descubrir');
    }
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

 preguntarPorLugar(lugar: Lugar | null) {
    if (lugar) {
        const mensaje = `Cuéntame más sobre ${lugar.nombre} en Quito`;
        this.cambiarVista('chat');
        setTimeout(() => {
            this.enviarTextoDirecto(mensaje);
        }, 100);
    }
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

  // 👈 MÉTODO PARA DESTACAR LUGAR
  async destacarLugar(lugar: any) {
    if (!lugar) {
      this.mostrarToast('No hay lugar seleccionado', 'error');
      return;
    }
    
    this.destacando = true;
    try {
      // Verificar si ya está destacado por este usuario
      const destacados = await this.admin.getMisDestacados().toPromise();
      if (destacados?.destacados?.some((d: any) => d.nombre === lugar.nombre)) {
        this.mostrarToast('⚠️ Este lugar ya está en tus destacados', 'info');
        return;
      }

      await this.admin.createDestacado({
        nombre: lugar.nombre,
        categoria: lugar.categoria || 'General',
        descripcion: lugar.descripcion || 'Lugar destacado desde el mapa',
        latitud: Number(lugar.latitud),
        longitud: Number(lugar.longitud),
        direccion: lugar.direccion || lugar.vicinity || '',
        horario: lugar.horario || '',
        precio: lugar.precio || '',
        imagen_url: lugar.photoUrl || ''
      }).toPromise();
      
      this.mostrarToast('⭐ Lugar destacado guardado exitosamente', 'success');
    } catch (err: any) {
      console.error('❌ Error destacando lugar:', err);
      this.mostrarToast(err.error?.error || 'Error al destacar el lugar', 'error');
    } finally {
      this.destacando = false;
    }
  }

  // 👈 MÉTODO guardarItinerarioActual
  async guardarItinerarioActual() {
    console.log('🔵 guardarItinerarioActual() ejecutado');
    
    const lugares = this.lugaresRecomendados();
    console.log('📦 Lugares:', lugares);
    
    if (!lugares || lugares.length === 0) {
        this.mostrarToast('No hay lugares para guardar');
        return;
    }

    this.mostrarModalGuardar();
  }

  mostrarModalGuardar() {
    const modal = document.createElement('div');
    modal.className = 'modal-guardar';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <span class="modal-icon">💾</span>
                <h3 class="modal-title">Guardar Itinerario</h3>
            </div>
            <div class="modal-body">
                <p class="modal-subtitle">¿Cómo quieres llamar a este itinerario?</p>
                <p class="modal-hint">Ej: "Mi plan en Quito", "Ruta de cafés", etc.</p>
                <input 
                    id="nombreItinerario" 
                    type="text" 
                    value="Mi plan" 
                    placeholder="Escribe un nombre..."
                    autofocus
                >
            </div>
            <div class="modal-footer">
                <button id="btnCancelar" class="btn-cancelar">Cancelar</button>
                <button id="btnGuardar" class="btn-guardar">💾 Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#nombreItinerario') as HTMLInputElement;
    input.focus();
    input.select();

    const guardar = () => {
        const nombre = input.value.trim();
        if (nombre) {
            modal.remove();
            this.ejecutarGuardado(nombre);
        }
    };

    const cancelar = () => {
        modal.remove();
        this.mostrarToast('Guardado cancelado', 'info');
    };

    modal.querySelector('#btnGuardar')?.addEventListener('click', guardar);
    modal.querySelector('#btnCancelar')?.addEventListener('click', cancelar);
    
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') guardar();
        if (e.key === 'Escape') cancelar();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cancelar();
    });
  }

  async ejecutarGuardado(nombre: string) {
    const lugares = this.lugaresRecomendados();
    if (!lugares || lugares.length === 0) {
        this.mostrarToast('No hay lugares para guardar');
        return;
    }

    this.guardandoItinerario = true;
    try {
        const lugaresIds = lugares
            .map(l => l.id)
            .filter((id): id is number => id != null);

        if (lugaresIds.length === 0) {
            this.mostrarToast('No se pudieron obtener los IDs de los lugares');
            return;
        }

        await this.perfil.guardarItinerario({
            nombre: nombre,
            descripcion: 'Itinerario guardado desde el chat',
            lugaresIds: lugaresIds
        }).toPromise();

        this.mostrarToast(`✅ "${nombre}" guardado con ${lugaresIds.length} lugares`, 'success');
        
        this.store.lugaresRecomendados.set([]);
        
    } catch (err: any) {
        console.error('❌ Error guardando itinerario:', err);
        this.mostrarToast(err.error?.error || '❌ Error al guardar el itinerario', 'error');
    } finally {
        this.guardandoItinerario = false;
    }
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info') {
    const toastsExistentes = document.querySelectorAll('.toast-notificacion');
    toastsExistentes.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notificacion ${tipo}`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
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