import { Component, OnInit, inject, effect, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Store } from '../../services/store';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule],
  template: `<div id="map"></div>`,
  styles: [`#map { width: 100%; height: 100%; min-height: 100vh; }`]
})
export class Mapa implements OnInit {
  private store = inject(Store);
  private platformId = inject(PLATFORM_ID);
  private map: any;
  private markersLayer: any;
  private isBrowser: boolean;

  private static readonly CATEGORIA_MAPA: Record<string, { color: string; icono: string }> = {
    cafetería:       { color: '#F97316', icono: 'coffee' },
    gastronomía:     { color: '#F97316', icono: 'restaurant' },
    restaurante:     { color: '#F97316', icono: 'restaurant' },
    cultura:         { color: '#8B5CF6', icono: 'museum' },
    museo:           { color: '#8B5CF6', icono: 'museum' },
    iglesia:         { color: '#8B5CF6', icono: 'church' },
    parque:          { color: '#22C55E', icono: 'park' },
    mirador:         { color: '#22C55E', icono: 'landscape' },
    entretenimiento: { color: '#EC4899', icono: 'theater_comedy' },
    'vida nocturna': { color: '#EC4899', icono: 'nightlife' },
    'centro comercial': { color: '#3B82F6', icono: 'shopping_cart' },
  };

  static crearIcono(L: any, categoria: string, color?: string, icono?: string): any {
    const entry = Mapa.CATEGORIA_MAPA[categoria?.toLowerCase()];
    const c = color || entry?.color || '#3B82F6';
    const i = icono || entry?.icono || 'place';

    return L.divIcon({
      className: '',
      html: `<div class="pin-marker" style="--pin-bg:${c}; background:${c}">
              <span class="material-icons pin-icon">${i}</span>
             </div>`,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -44],
    });
  }

  // Nueva señal para controlar cuándo el mapa está listo
  private mapReady = signal(false);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Effect que reacciona a AMBAS señales: lugares + mapReady
    effect(() => {
      const lugares = this.store.lugaresRecomendados();
      const ready = this.mapReady();

      // 👇 CORRECCIÓN: Quitamos el "&& lugares.length > 0"
      // Ahora si "lugares" viene vacío, también entrará a la función para limpiar el mapa.
      if (this.isBrowser && ready && this.map) {
        this.actualizarMarcadores(lugares);
      }
    });
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    import('leaflet').then((L) => {
      this.initMap(L);
    });
  }

  private initMap(L: any): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    setTimeout(() => {
      this.map = L.map('map').setView([-0.2201, -78.5123], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
      this.map.invalidateSize();

      this.map.locate({ setView: true, maxZoom: 16 });

      this.map.on('locationfound', (e: any) => {
        const radius = e.accuracy / 2;
        L.marker(e.latlng).addTo(this.map)
          .bindPopup(`¡Estás aquí! (Precisión: ${Math.round(radius)} metros)`).openPopup();
        L.circle(e.latlng, radius, {
          color: '#2196F3',
          fillColor: '#2196F3',
          fillOpacity: 0.2
        }).addTo(this.map);
      });

      this.map.on('locationerror', (e: any) => {
        console.warn("No se pudo obtener la ubicación:", e.message);
      });

      // ¡AQUÍ activamos la señal mapReady!
      this.mapReady.set(true);

    }, 400);
  }

  private markersCache: any[] = [];

  private actualizarMarcadores(lugares: any[]): void {
    if (!this.map || !this.markersLayer) return;

    // 🧹 LIMPIEZA SÍNCRONA: elimina pines viejos antes de cualquier async
    this.markersLayer.clearLayers();
    this.markersCache = [];

    if (lugares.length === 0) return;

    import('leaflet').then((L) => {
      const nuevosMarcadores: any[] = [];

      lugares.forEach(lugar => {
        const lat = Number(lugar.latitud);
        const lng = Number(lugar.longitud);

        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`⚠️ Coordenadas inválidas para ${lugar.nombre}:`, lugar.latitud, lugar.longitud);
          return;
        }

        const desc = lugar.descripcion
          ? lugar.descripcion.length > 100
            ? lugar.descripcion.slice(0, 100) + '...'
            : lugar.descripcion
          : '';

        const popupHTML = `
          <div style="font-family: Arial, sans-serif; min-width: 180px;">
            <strong style="color: #1976d2; font-size: 1.1em;">${lugar.nombre}</strong><br>
            <span style="color: #666; font-size: 0.9em;">📍 ${lugar.categoria}</span>
            ${desc ? `<p style="margin:4px 0 0;font-size:0.85em;color:#444;line-height:1.4;">${desc}</p>` : ''}
            ${lugar.horario ? `<hr style="margin:5px 0;"><span style="font-size:0.85em;">🕒 <b>Horario:</b> ${lugar.horario}</span>` : ''}
          </div>
        `;

        const marker = L.marker([lat, lng], {
  icon: L.icon({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}).bindPopup(popupHTML);

        marker.on('click', () => {
          this.store.lugarSeleccionado.set(lugar);
          this.store.vistaActual.set('detalle');
        });

        this.markersLayer.addLayer(marker);
        nuevosMarcadores.push(marker);
        this.markersCache.push(marker);
      });

      if (nuevosMarcadores.length === 0) return;

      this.map.invalidateSize();
      const group = L.featureGroup(nuevosMarcadores);
      this.map.fitBounds(group.getBounds().pad(0.2), { animate: true, duration: 1 });

      if (nuevosMarcadores.length === 1) {
        const marker = nuevosMarcadores[0];
        this.map.flyTo(marker.getLatLng(), 16, { animate: true, duration: 1.5 });
        marker.openPopup();
      }
    });
  }
}