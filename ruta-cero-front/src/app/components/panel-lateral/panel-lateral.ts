import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '../../services/store';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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

  vista = this.store.vistaActual;
  lugarSeleccionado = this.store.lugarSeleccionado;
  historial = this.store.historialChat;
  procesandoMensaje = false;

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
          console.warn("⚠️ Advertencia: lugaresFisicos llegó vacío o undefined");
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

  formatearMensaje(texto: string): string {
    if (!texto) return '';

    let html = texto;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }
}