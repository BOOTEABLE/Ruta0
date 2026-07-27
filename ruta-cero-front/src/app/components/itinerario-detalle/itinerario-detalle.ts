import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PerfilService, ItinerarioConLugares, Lugar } from '../../services/perfil.service';
import { Store } from '../../services/store';

@Component({
  selector: 'app-itinerario-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './itinerario-detalle.html',
  styleUrl: './itinerario-detalle.css'
})
export class ItinerarioDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private perfil = inject(PerfilService);
  private store = inject(Store);

  itinerario = signal<ItinerarioConLugares | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.cargarItinerario(id);
    }
  }

  cargarItinerario(id: number) {
    this.cargando.set(true);
    this.perfil.obtenerItinerario(id).subscribe({
      next: (res) => {
        this.itinerario.set(res.itinerario);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al cargar el itinerario');
        this.cargando.set(false);
      }
    });
  }

  verEnMapa() {
    const it = this.itinerario();
    if (it?.lugares && it.lugares.length > 0) {
      // Guardar en store para que el mapa lo muestre
      const lugares = it.lugares.map(l => ({
        ...l,
        latitud: Number(l.latitud),
        longitud: Number(l.longitud)
      }));
      this.store.lugaresRecomendados.set(lugares as any);
      this.store.vistaActual.set('descubrir');
      this.router.navigate(['/']);
    }
  }

  volver() {
    this.router.navigate(['/perfil']);
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
}