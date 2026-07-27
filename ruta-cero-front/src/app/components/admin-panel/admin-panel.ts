import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, AdminStats, CacheStatsResponse, CacheEntrySummary, CacheEntry, AdminUser, UserResponse } from '../../services/admin.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanelComponent implements OnInit {
  private admin = inject(AdminService);
  private router = inject(Router);

  // Estado
  activeTab = signal<'stats' | 'cache' | 'users'>('stats');
  cargando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  // Datos
  adminStats = signal<AdminStats | null>(null);
  cacheStats = signal<CacheStatsResponse | null>(null);
  cacheEntries = signal<CacheEntry[]>([]);
  cacheTotal = signal(0);
  cachePage = signal(1);

  users = signal<AdminUser[]>([]);
  usersTotal = signal(0);
  usersPage = signal(1);
  usersLoading = signal(false);

  ngOnInit() {
    this.cargarTodo();
  }

  setTab(tab: 'stats' | 'cache' | 'users') {
    this.activeTab.set(tab);
    if (tab === 'cache' && this.cacheEntries().length === 0) {
      this.cargarCacheStats();
    }
    if (tab === 'users' && this.users().length === 0) {
      this.cargarUsers();
    }
  }

  async cargarTodo() {
    await Promise.all([
      this.cargarAdminStats(),
      this.cargarCacheStats()
    ]);
  }

  async cargarAdminStats() {
    this.cargando.set(true);
    try {
      const stats = await this.admin.getAdminStats().toPromise();
      if (stats) this.adminStats.set(stats);
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error cargando estadísticas');
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarCacheStats() {
    this.cargando.set(true);
    try {
      const [stats, entries] = await Promise.all([
        this.admin.getCacheStats().toPromise(),
        this.admin.getCacheEntries(1, 50).toPromise()
      ]);
      
      if (stats) this.cacheStats.set(stats);
      if (entries) {
        this.cacheEntries.set(entries.entradas);
        this.cacheTotal.set(entries.total);
      }
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error cargando caché');
    } finally {
      this.cargando.set(false);
    }
  }

  async limpiarCache() {
    if (!confirm('¿Eliminar TODA la caché? Esta acción no se puede deshacer.')) return;
    
    this.cargando.set(true);
    try {
      await this.admin.clearCache().toPromise();
      this.exito.set('Caché limpiada correctamente');
      await this.cargarCacheStats();
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error limpiando caché');
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarCacheEntry(key: string) {
    if (!confirm('¿Eliminar esta entrada de caché?')) return;
    
    try {
      await this.admin.deleteCacheEntry(key).toPromise();
      this.exito.set('Entrada eliminada');
      await this.cargarCacheStats();
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error eliminando entrada');
    }
  }

  async cargarUsers() {
    this.usersLoading.set(true);
    try {
      const data = await this.admin.getUsers(this.usersPage(), 20).toPromise();
      if (data) {
        this.users.set(data.usuarios);
        this.usersTotal.set(data.total);
      }
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error cargando usuarios');
    } finally {
      this.usersLoading.set(false);
    }
  }

  async toggleUserRole(user: AdminUser) {
    const nuevoRol = user.rol === 'admin' ? 'user' : 'admin';
    if (!confirm(`${nuevoRol === 'admin' ? 'Dar' : 'Quitar'} permisos de admin a ${user.nombre}?`)) return;

    try {
      await this.admin.updateUserRole(user.id, nuevoRol).toPromise();
      this.exito.set(`Rol actualizado a ${nuevoRol}`);
      await this.cargarUsers();
      await this.cargarAdminStats();
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error actualizando rol');
    }
  }

  async eliminarUser(user: AdminUser) {
    if (!confirm(`¿Eliminar usuario ${user.nombre} (${user.email})? Esta acción no se puede deshacer.`)) return;
    
    try {
      await this.admin.deleteUser(user.id).toPromise();
      this.exito.set('Usuario eliminado');
      await this.cargarUsers();
      await this.cargarAdminStats();
    } catch (err: any) {
      this.error.set(err.error?.error || 'Error eliminando usuario');
    }
  }

  // Caché pagination
  async siguientePaginaCache() {
    this.cachePage.update(p => p + 1);
    try {
      const data = await this.admin.getCacheEntries(this.cachePage(), 50).toPromise();
      if (data) {
        this.cacheEntries.set(data.entradas);
        this.cacheTotal.set(data.total);
      }
    } catch (err: any) {
      this.error.set('Error cargando página');
    }
  }

  async paginaAnteriorCache() {
    this.cachePage.update(p => Math.max(1, p - 1));
    try {
      const data = await this.admin.getCacheEntries(this.cachePage(), 50).toPromise();
      if (data) {
        this.cacheEntries.set(data.entradas);
        this.cacheTotal.set(data.total);
      }
    } catch (err: any) {
      this.error.set('Error cargando página');
    }
  }

  // Users pagination
  async siguientePaginaUsers() {
    this.usersPage.update(p => p + 1);
    await this.cargarUsers();
  }

  async paginaAnteriorUsers() {
    this.usersPage.update(p => Math.max(1, p - 1));
    await this.cargarUsers();
  }

  volverAlMapa() {
    this.router.navigate(['/']);
  }

  formatearFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helpers para template
  Math = Math;
}