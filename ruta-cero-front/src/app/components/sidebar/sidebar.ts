import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Store } from '../../services/store';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  ruta: string;
  seccion: 'mapa' | 'chat' | 'rutas' | 'favoritos' | 'historial' | 'configuracion';
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  private router = inject(Router);
  private store = inject(Store);
  private sub?: Subscription;

  activeItem = signal('mapa');

  menuItems: MenuItem[] = [
    { id: 'mapa',           label: 'Mapa',           icon: 'map',       ruta: '/',         seccion: 'mapa' },
    { id: 'chatbot',        label: 'Chatbot',        icon: 'chat',      ruta: '/',         seccion: 'chat' },
    { id: 'rutas',          label: 'Rutas',          icon: 'route',     ruta: '/',         seccion: 'rutas' },
    { id: 'favoritos',      label: 'Favoritos',      icon: 'favorite',  ruta: '/',         seccion: 'favoritos' },
    { id: 'historial',      label: 'Historial',      icon: 'history',   ruta: '/',         seccion: 'historial' },

    { id: 'configuracion',  label: 'Configuración',  icon: 'settings',  ruta: '/',         seccion: 'configuracion' },
  ];

  ngOnInit() {
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.sincronizarConRuta());
    this.sincronizarConRuta();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  navegar(item: MenuItem) {
    this.activeItem.set(item.id);
    this.store.seccionSidebar.set(item.seccion);
    this.router.navigate([item.ruta]);
  }

  private sincronizarConRuta() {
    const url = this.router.url;
    const encontrado = this.menuItems.find((m) => url.startsWith(m.ruta) && m.ruta !== '/');
    if (encontrado) {
      this.activeItem.set(encontrado.id);
      this.store.seccionSidebar.set(encontrado.seccion);
    } else {
      this.activeItem.set('mapa');
      this.store.seccionSidebar.set('mapa');
    }
  }
}
