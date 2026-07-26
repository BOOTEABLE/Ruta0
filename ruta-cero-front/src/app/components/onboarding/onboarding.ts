import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css'
})
export class OnboardingComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  paso = signal(1);
  cargando = signal(false);
  error = signal<string | null>(null);

  preferencias = signal({
    categoriasFavoritas: [] as string[],
    categoriasEvitadas: [] as string[],
    presupuestoMinimo: ''
  });

  totalPasos = 3;

  categoriasDisponibles = [
    { id: 'Cafetería', icon: '☕', desc: 'Cafés, pastelerías, brunch' },
    { id: 'Gastronomía', icon: '🍽️', desc: 'Restaurantes, comida típica, internacional' },
    { id: 'Cultura', icon: '🏛️', desc: 'Museos, centros culturales, teatros' },
    { id: 'Parques', icon: '🌳', desc: 'Parques urbanos, jardines, áreas verdes' },
    { id: 'Miradores', icon: '🌄', desc: 'Puntos panorámicos, vistas de la ciudad' },
    { id: 'Entretenimiento', icon: '🎮', desc: 'Cines, boleras, salas de juegos' },
    { id: 'Centros Comerciales', icon: '🛍️', desc: 'Malls, plazas comerciales, outlets' },
    { id: 'Vida Nocturna', icon: '🌙', desc: 'Bares, discotecas, pubs, coctelerías' }
  ];

  opcionesPresupuesto = [
    { valor: '$', etiqueta: '$', rango: 'Económico' },
    { valor: '$$', etiqueta: '$$', rango: 'Medio' },
    { valor: '$$$', etiqueta: '$$$', rango: 'Premium' }
  ];

  progreso = computed(() => (this.paso() / this.totalPasos) * 100);

  // Paso 1: Categorías favoritas
  toggleFavorita(cat: string) {
    this.error.set(null);
    const favs = this.preferencias().categoriasFavoritas;
    const idx = favs.indexOf(cat);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      // Quitar de evitadas si estaba ahí
      const evIdx = this.preferencias().categoriasEvitadas.indexOf(cat);
      if (evIdx >= 0) this.preferencias().categoriasEvitadas.splice(evIdx, 1);
      favs.push(cat);
    }
    this.preferencias.set({ ...this.preferencias() });
  }

  esFavorita(cat: string): boolean {
    return this.preferencias().categoriasFavoritas.includes(cat);
  }

  // Paso 2: Categorías a evitar
  toggleEvitada(cat: string) {
    this.error.set(null);
    const evs = this.preferencias().categoriasEvitadas;
    const idx = evs.indexOf(cat);
    if (idx >= 0) {
      evs.splice(idx, 1);
    } else {
      // Quitar de favoritas si estaba ahí
      const favIdx = this.preferencias().categoriasFavoritas.indexOf(cat);
      if (favIdx >= 0) this.preferencias().categoriasFavoritas.splice(favIdx, 1);
      evs.push(cat);
    }
    this.preferencias.set({ ...this.preferencias() });
  }

  esEvitada(cat: string): boolean {
    return this.preferencias().categoriasEvitadas.includes(cat);
  }

  // Paso 3: Presupuesto
  presupuestoSeleccionado(valor: string) {
    this.error.set(null);
    this.preferencias.update(p => ({ ...p, presupuestoMinimo: valor }));
  }

  // Navegación
  siguiente() {
    this.error.set(null);
    
    if (this.paso() === 1 && this.preferencias().categoriasFavoritas.length === 0) {
      this.error.set('Selecciona al menos una categoría que te guste');
      return;
    }
    
    if (this.paso() < this.totalPasos) {
      this.paso.update(p => p + 1);
    }
  }

  anterior() {
    this.error.set(null);
    if (this.paso() > 1) {
      this.paso.update(p => p - 1);
    }
  }

  async finalizar() {
    this.error.set(null);
    
    // Validar conflictos
    const favs = this.preferencias().categoriasFavoritas;
    const evs = this.preferencias().categoriasEvitadas;
    const conflicto = favs.filter(c => evs.includes(c));
    if (conflicto.length > 0) {
      this.error.set(`Conflicto: ${conflicto.join(', ')} está en ambas listas`);
      return;
    }

    this.cargando.set(true);
    try {
      // 1. Guardar preferencias
      await this.auth.actualizarPreferencias({
        categoriasFavoritas: favs,
        categoriasEvitadas: evs,
        presupuestoMinimo: this.preferencias().presupuestoMinimo
      }).toPromise();

      // 2. Marcar onboarding completado
      await this.auth.completeOnboarding().toPromise();

      // 3. Navegar al dashboard
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error al completar onboarding');
    } finally {
      this.cargando.set(false);
    }
  }
}