import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  tema = signal<'light' | 'dark'>('light');
  tamanoFuente = signal<'normal' | 'grande' | 'extra-grande'>('normal');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarPreferencias();
      effect(() => {
        const tema = this.tema();
        const tamano = this.tamanoFuente();
        this.aplicarTema(tema);
        this.aplicarTamano(tamano);
        localStorage.setItem('tema', tema);
        localStorage.setItem('tamanoFuente', tamano);
      });
    }
  }

  private cargarPreferencias() {
    const tema = localStorage.getItem('tema') as 'light' | 'dark' | null;
    const tamano = localStorage.getItem('tamanoFuente') as 'normal' | 'grande' | 'extra-grande' | null;
    if (tema) this.tema.set(tema);
    if (tamano) this.tamanoFuente.set(tamano);
  }

  private aplicarTema(tema: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', tema);
    document.body.setAttribute('data-theme', tema);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(tema);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(tema);
    const scheme = tema === 'dark' ? 'dark' : 'light';
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', scheme);
    document.body.style.colorScheme = scheme;
  }

  private aplicarTamano(tamano: string) {
    const sizes: Record<string, string> = {
      'normal': '16px',
      'grande': '20px',
      'extra-grande': '24px'
    };
    document.documentElement.style.fontSize = sizes[tamano] || '16px';
  }

  alternarTema() {
    this.tema.set(this.tema() === 'light' ? 'dark' : 'light');
  }

  setTema(tema: 'light' | 'dark') {
    this.tema.set(tema);
  }

  setTamanoFuente(tamano: 'normal' | 'grande' | 'extra-grande') {
    this.tamanoFuente.set(tamano);
  }

  aplicarPreferencias(prefs: { tema: 'light' | 'dark'; tamanoFuente: 'normal' | 'grande' | 'extra-grande' }) {
    this.tema.set(prefs.tema);
    this.tamanoFuente.set(prefs.tamanoFuente);
  }
}
