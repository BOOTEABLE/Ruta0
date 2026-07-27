import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'ruta0_theme';
  private readonly FONT_SIZE_KEY = 'ruta0_font_size';

  tema = signal<'light' | 'dark'>('light');
  tamanoFuente = signal<'normal' | 'grande' | 'extra-grande'>('normal');

  constructor() {
    // Cargar preferencias guardadas
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(this.THEME_KEY) as 'light' | 'dark' | null;
      const savedFont = localStorage.getItem(this.FONT_SIZE_KEY) as 'normal' | 'grande' | 'extra-grande' | null;
      
      if (savedTheme) this.tema.set(savedTheme);
      if (savedFont) this.tamanoFuente.set(savedFont);

      // Aplicar al cargar
      this.aplicarTema();
      this.aplicarTamanoFuente();
    }

    // Guardar y aplicar cambios automáticamente
    effect(() => {
      const t = this.tema();
      localStorage.setItem(this.THEME_KEY, t);
      this.aplicarTema();
    });

    effect(() => {
      const f = this.tamanoFuente();
      localStorage.setItem(this.FONT_SIZE_KEY, f);
      this.aplicarTamanoFuente();
    });
  }

  private aplicarTema(): void {
    if (typeof document !== 'undefined') {
      if (this.tema() === 'dark') {
        document.documentElement.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
      }
    }
  }

  private aplicarTamanoFuente(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('font-normal', 'font-grande', 'font-extra-grande');
      document.documentElement.classList.add(`font-${this.tamanoFuente()}`);
    }
  }

  alternarTema(): void {
    this.tema.update(t => t === 'light' ? 'dark' : 'light');
  }

  setTema(t: 'light' | 'dark'): void {
    this.tema.set(t);
  }

  setTamanoFuente(f: 'normal' | 'grande' | 'extra-grande'): void {
    this.tamanoFuente.set(f);
  }
}