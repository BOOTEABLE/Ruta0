import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PerfilService, PreferenciasUsuario } from '../../services/perfil.service';

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

  currentUser = this.auth.currentUser;

  cargando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  volverAlMapa() {
    this.router.navigate(['/']);
  }

  preferencias = signal<PreferenciasUsuario>({
    categoriasFavoritas: [],
    categoriasEvitadas: [],
    presupuestoMinimo: '',
    presupuestoMaximo: ''
  });

  categoriasDisponibles = [
    'Cafetería', 'Gastronomía', 'Cultura', 'Parques',
    'Miradores', 'Entretenimiento', 'Centros Comerciales', 'Vida Nocturna'
  ];

  ngOnInit() {
    this.cargarPreferencias();
  }

  limpiarMensajes() {
    this.error.set(null);
    this.exito.set(null);
  }

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