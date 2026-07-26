import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '../../services/store';
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
  private auth = inject(AuthService);
  private perfil = inject(PerfilService);
  private router = inject(Router);

  vista = this.store.vistaActual;
  lugarSeleccionado = this.store.lugarSeleccionado;
  historial = this.store.historialChat;
  lugaresRecomendados = this.store.lugaresRecomendados;
  procesandoMensaje = false;
  guardandoItinerario = false;

  miLatitud: number | null = null;
  miLongitud: number | null = null;

  ngOnInit() {
    console.log("📍 Buscando GPS inicial silenciosamente...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          this.miLatitud = posicion.coords.latitude;
          this.miLongitud = posicion.coords.longitude;
          console.log(`✅ ¡Ubicación lista! Coordenadas guardadas: ${this.miLatitud}, ${this.miLongitud}`);
        },
        (error) => {
          console.warn("⚠️ No se pudo obtener el GPS inicial.");
        },
        { enableHighAccuracy: true }
      );
    }
  }

  cambiarVista(nuevaVista: 'descubrir' | 'chat' | 'detalle') {
    this.store.vistaActual.set(nuevaVista);
  }

  irAPerfil() {
    this.router.navigate(['/perfil']);
  }

  logout() {
    this.auth.logout();
  }

  enviarMensaje(texto: string, inputElement: HTMLInputElement) {
    if (!texto.trim() || this.procesandoMensaje) return;
    this.procesandoMensaje = true;

    this.historial.update(h => [...h, { emisor: 'usuario', texto }]);
    inputElement.value = '';

    this.llamarBackend(texto, this.miLatitud, this.miLongitud);
  }

  private llamarBackend(texto: string, lat: number | null, lng: number | null) {
    const payload = { mensaje: texto, lat: lat, lng: lng, historial: this.historial() };

    this.api.post<any>('/api/chat', payload).subscribe({
      next: (res) => {
        console.log("📦 Respuesta completa del servidor:", res);

        const textoDelServidor = res?.respuesta || "Recibí los datos...";
        this.historial.update(h => [...h, { emisor: 'bot', texto: textoDelServidor }]);

        // 👇 FIX: antes, cuando lugaresFisicos llegaba vacío ([]), este bloque
        // no hacía nada — dejaba los pines de la pregunta ANTERIOR pegados
        // en el mapa (pines fantasma), aunque la respuesta actual no tuviera
        // nada que ver con esos lugares. El mapa debe reflejar SIEMPRE la
        // última respuesta, así que sincronizamos incluso cuando es [].
        if (res.lugaresFisicos && res.lugaresFisicos.length > 0) {
          console.log("📍 ¡Sí llegaron los lugares! Enviando al Store...");
          // 👇 Conversión EXPLÍCITA a number para evitar type mismatch en el mapa
          const lugaresConNumeros = res.lugaresFisicos.map((lugar: any) => ({
            ...lugar,
            latitud: Number(lugar.latitud),
            longitud: Number(lugar.longitud)
          }));
          this.store.lugaresRecomendados.set(lugaresConNumeros);
        } else {
          console.log("📍 Esta respuesta no recomendó lugares — limpiando pines del mapa.");
          this.store.lugaresRecomendados.set([]);
        }

        this.procesandoMensaje = false;
      },
      error: (err) => {
        console.error("❌ Error conectando con el backend:", err);
        this.historial.update(h => [...h, { emisor: 'bot', texto: "Upps, no pude conectar con el servidor." }]);
        this.procesandoMensaje = false;
      }
    });
  }

  seleccionarLugarEjemplo() {
    const ejemplo = {
      nombre: 'Café de la Vaca Centro',
      categoria: 'Cafetería',
      latitud: -0.2225,
      longitud: -78.5118,
      descripcion: 'Excelente cafetería tradicional ubicada en el centro histórico de la ciudad.'
    };

    this.store.lugaresRecomendados.set([ejemplo]);
    this.store.lugarSeleccionado.set(ejemplo);
    this.store.vistaActual.set('detalle');
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
      console.error('Error guardando itinerario:', err);
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
}