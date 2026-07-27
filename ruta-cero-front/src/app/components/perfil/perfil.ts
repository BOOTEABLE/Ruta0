import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PerfilService, PreferenciasUsuario, Itinerario, ItinerarioConLugares } from '../../services/perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilComponent implements OnInit {
  private auth = inject(AuthService);
  private perfil = inject(PerfilService);
  private router = inject(Router);

  // Exponer currentUser al template
  currentUser = this.auth.currentUser;

  // Estado
  activeTab = signal<'preferencias' | 'itinerarios'>('preferencias');
  cargando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  volverAlMapa() {
    this.router.navigate(['/']);
  }

  // Preferencias
  preferencias = signal<PreferenciasUsuario>({
    categoriasFavoritas: [],
    categoriasEvitadas: [],
    presupuestoMinimo: '',
    presupuestoMaximo: ''
  });

  // Itinerarios
  itinerarios = signal<Itinerario[]>([]);
  itinerarioExpandido = signal<number | null>(null);
  itinerarioDetalle = signal<ItinerarioConLugares | null>(null);

  // Categorías disponibles (para selectores)
  categoriasDisponibles = [
    'Cafetería', 'Gastronomía', 'Cultura', 'Parques',
    'Miradores', 'Entretenimiento', 'Centros Comerciales', 'Vida Nocturna'
  ];

  ngOnInit() {
    this.cargarPreferencias();
    this.cargarItinerarios();
  }

  setTab(tab: 'preferencias' | 'itinerarios') {
    this.activeTab.set(tab);
    this.limpiarMensajes();
  }

  limpiarMensajes() {
    this.error.set(null);
    this.exito.set(null);
  }

  // --- PREFERENCIAS ---
  cargarPreferencias() {
    this.cargando.set(true);
    this.perfil.obtenerPreferencias().subscribe({
      next: (res) => {
        if (res.preferencias) {
          this.preferencias.set({
            categoriasFavoritas: res.preferencias.categoriasFavoritas || [],
            categoriasEvitadas: res.preferencias.categoriasEvitadas || [],
            presupuestoMinimo: res.preferencias.presupuestoMinimo || '',
            presupuestoMaximo: res.preferencias.presupuestoMaximo || ''
          });
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando preferencias:', err);
        this.cargando.set(false);
      }
    });
  }

  toggleCategoria(lista: 'favoritas' | 'evitadas', categoria: string) {
    const actual = this.preferencias()[lista === 'favoritas' ? 'categoriasFavoritas' : 'categoriasEvitadas'];
    const nueva = actual.includes(categoria)
      ? actual.filter(c => c !== categoria)
      : [...actual, categoria];
    
    this.preferencias.update(p => ({
      ...p,
      [lista === 'favoritas' ? 'categoriasFavoritas' : 'categoriasEvitadas']: nueva
    }));
  }

  esFavorita(categoria: string): boolean {
    return this.preferencias().categoriasFavoritas.includes(categoria);
  }

  esEvitada(categoria: string): boolean {
    return this.preferencias().categoriasEvitadas.includes(categoria);
  }

  async guardarPreferencias() {
    // Validar conflicto
    const fav = this.preferencias().categoriasFavoritas;
    const evi = this.preferencias().categoriasEvitadas;
    const conflicto = fav.filter(c => evi.includes(c));
    
    if (conflicto.length > 0) {
      this.error.set(`Conflicto: ${conflicto.join(', ')} está en ambas listas`);
      return;
    }

    this.cargando.set(true);
    this.limpiarMensajes();

    try {
      await this.perfil.actualizarPreferencias(this.preferencias()).toPromise();
      this.exito.set('Preferencias guardadas correctamente');
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error al guardar preferencias');
    } finally {
      this.cargando.set(false);
    }
  }

  // --- ITINERARIOS ---
  cargarItinerarios() {
    this.perfil.listarItinerarios().subscribe({
      next: (res) => {
        this.itinerarios.set(res.itinerarios || []);
      },
      error: (err) => {
        console.error('Error cargando itinerarios:', err);
      }
    });
  }

  verItinerario(itinerario: Itinerario) {
    if (this.itinerarioExpandido() === itinerario.id) {
      this.itinerarioExpandido.set(null);
      this.itinerarioDetalle.set(null);
      return;
    }

    this.cargando.set(true);
    this.perfil.obtenerItinerario(itinerario.id).subscribe({
      next: (res) => {
        this.itinerarioDetalle.set(res.itinerario);
        this.itinerarioExpandido.set(itinerario.id);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando detalle:', err);
        this.cargando.set(false);
      }
    });
  }

  verEnMapa(itinerario: ItinerarioConLugares) {
    if (itinerario.lugares && itinerario.lugares.length > 0) {
      // Navegar al dashboard y pasar el itinerario por estado (o queryParams)
      // Por simplicidad, usamos sessionStorage
      sessionStorage.setItem('itinerarioActivo', JSON.stringify(itinerario));
      this.router.navigate(['/']);
    }
  }

  async eliminarItinerario(id: number, event: Event) {
    event.stopPropagation();
    if (!confirm('¿Eliminar este itinerario?')) return;

    try {
      await this.perfil.eliminarItinerario(id).toPromise();
      this.itinerarios.update(arr => arr.filter(i => i.id !== id));
      if (this.itinerarioExpandido() === id) {
        this.itinerarioExpandido.set(null);
      }
      this.exito.set('Itinerario eliminado');
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error al eliminar');
    }
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

  logout() {
    this.auth.logout();
  }
}