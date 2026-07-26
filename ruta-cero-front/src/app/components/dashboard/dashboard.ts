import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mapa } from '../mapa/mapa';
import { PanelLateral } from '../panel-lateral/panel-lateral';
import { PerfilService, Lugar } from '../../services/perfil.service';
import { Store } from '../../services/store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Mapa, PanelLateral],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private perfil = inject(PerfilService);
  private store = inject(Store);

  cargandoRecomendaciones = signal(false);

  ngOnInit() {
    this.cargarRecomendacionesIniciales();
  }

  private async cargarRecomendacionesIniciales() {
    // Obtener ubicación del usuario (del panel lateral o geolocalización)
    let lat: number | null = null;
    let lng: number | null = null;

    // Intentar obtener del panel lateral (que ya la guarda en store)
    // O usar geolocalización directamente
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (e) {
        console.warn('No se pudo obtener geolocalización para recomendaciones iniciales');
      }
    }

    if (lat !== null && lng !== null) {
      this.cargandoRecomendaciones.set(true);
      try {
        const res = await this.perfil.obtenerRecomendaciones(lat, lng, 2000).toPromise();
        if (res?.lugaresFisicos?.length) {
          // Convertir a números para el mapa
          const lugares = res.lugaresFisicos.map((l: any) => ({
            ...l,
            latitud: Number(l.latitud),
            longitud: Number(l.longitud)
          }));
          this.store.lugaresRecomendados.set(lugares);
        }
      } catch (err) {
        console.error('Error cargando recomendaciones iniciales:', err);
      } finally {
        this.cargandoRecomendaciones.set(false);
      }
    }
  }
}