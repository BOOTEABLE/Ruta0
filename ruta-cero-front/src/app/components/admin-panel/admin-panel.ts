import { Component, inject, OnInit, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminStats, CacheStatsResponse, CacheEntrySummary, CacheEntry, AdminUser, UserResponse, ApiStatsResponse } from '../../services/admin.service';
import { Chart, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanelComponent implements OnInit, AfterViewInit {
  private admin = inject(AdminService);
  private router = inject(Router);

  // Referencias a los canvas para gráficos
  @ViewChild('categoriasChart') categoriasChartRef!: ElementRef;
  @ViewChild('apiUsageChart') apiUsageChartRef!: ElementRef;
  @ViewChild('tokensChart') tokensChartRef!: ElementRef;
  
  private categoriasChart: Chart | null = null;
  private apiUsageChart: Chart | null = null;
  private tokensChart: Chart | null = null;

  // Estado
  activeTab = signal<'stats' | 'cache' | 'users' | 'destacados' | 'graficos'>('stats');
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

  // Estadísticas de API
  apiStats = signal<ApiStatsResponse | null>(null);

  // Destacados
  destacados = signal<any[]>([]);
  destacadoForm = signal({
    nombre: '',
    categoria: '',
    descripcion: '',
    latitud: 0,
    longitud: 0,
    direccion: '',
    horario: '',
    precio: '',
    imagen_url: ''
  });
  editandoDestacado = signal<number | null>(null);
  cargandoDestacados = signal(false);

  // Categorías disponibles
  categoriasDisponibles = [
    'Cafetería', 'Gastronomía', 'Cultura', 'Parques',
    'Miradores', 'Entretenimiento', 'Centros Comerciales', 'Vida Nocturna'
  ];

  ngOnInit() {
    this.cargarTodo();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.crearGraficos();
    }, 500);
  }

  private crearGraficos() {
    this.crearGraficoCategorias();
    this.crearGraficoApiUsage();
    this.crearGraficoTokens();
  }

  private crearGraficoCategorias() {
    if (!this.categoriasChartRef) return;

    const data = {
      labels: ['Cafetería', 'Parques', 'Museos', 'Restaurantes', 'Miradores', 'Otros'],
      datasets: [{
        label: 'Lugares en caché por categoría',
        data: [45, 32, 28, 24, 15, 36],
        backgroundColor: [
          'rgba(46, 125, 50, 0.7)',
          'rgba(33, 150, 243, 0.7)',
          'rgba(156, 39, 176, 0.7)',
          'rgba(255, 152, 0, 0.7)',
          'rgba(244, 67, 54, 0.7)',
          'rgba(96, 125, 139, 0.7)'
        ],
        borderColor: [
          '#2e7d32',
          '#1976d2',
          '#7b1fa2',
          '#f57c00',
          '#d32f2f',
          '#546e7a'
        ],
        borderWidth: 2
      }]
    };

    this.categoriasChart = new Chart(this.categoriasChartRef.nativeElement, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        }
      }
    });
  }

  private crearGraficoApiUsage() {
    if (!this.apiUsageChartRef) return;

    const data = {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Consultas a API',
        data: [12, 19, 3, 5, 2, 3, 8],
        backgroundColor: 'rgba(46, 125, 50, 0.2)',
        borderColor: '#2e7d32',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#2e7d32',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    };

    this.apiUsageChart = new Chart(this.apiUsageChartRef.nativeElement, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 15,
              usePointStyle: true
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                size: 11
              }
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  private crearGraficoTokens() {
    if (!this.tokensChartRef) return;

    const data = {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Tokens consumidos',
        data: [150, 230, 45, 60, 25, 35, 90],
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: '#f59e0b',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    };

    this.tokensChart = new Chart(this.tokensChartRef.nativeElement, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 15,
              usePointStyle: true
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 50,
              font: {
                size: 11
              }
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  destroyCharts() {
    if (this.categoriasChart) {
      this.categoriasChart.destroy();
      this.categoriasChart = null;
    }
    if (this.apiUsageChart) {
      this.apiUsageChart.destroy();
      this.apiUsageChart = null;
    }
    if (this.tokensChart) {
      this.tokensChart.destroy();
      this.tokensChart = null;
    }
  }

  setTab(tab: 'stats' | 'cache' | 'users' | 'destacados' | 'graficos') {
    this.activeTab.set(tab);
    
    if (tab !== 'graficos') {
      this.destroyCharts();
    }
    
    if (tab === 'cache' && this.cacheEntries().length === 0) {
      this.cargarCacheStats();
    }
    if (tab === 'users' && this.users().length === 0) {
      this.cargarUsers();
    }
    if (tab === 'destacados' && this.destacados().length === 0) {
      this.cargarDestacados();
    }
    if (tab === 'graficos') {
      setTimeout(() => {
        this.crearGraficos();
        this.cargarEstadisticasAPI();
      }, 300);
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

  // ===== DESTACADOS =====
  async cargarDestacados() {
    console.log('🔵 Cargando destacados...');
    this.cargandoDestacados.set(true);
    try {
      const data = await this.admin.getAllDestacados().toPromise();
      console.log('🔍 Destacados recibidos:', data);
      if (data) {
        this.destacados.set(data.destacados || []);
      }
    } catch (err: any) {
      console.error('❌ Error cargando destacados:', err);
      this.error.set(err.error?.error || 'Error cargando destacados');
    } finally {
      this.cargandoDestacados.set(false);
    }
  }

  nuevoDestacado() {
    console.log('🔵 Nuevo destacado - abriendo formulario');
    this.editandoDestacado.set(-1);
    this.destacadoForm.set({
      nombre: '',
      categoria: '',
      descripcion: '',
      latitud: 0,
      longitud: 0,
      direccion: '',
      horario: '',
      precio: '',
      imagen_url: ''
    });
  }

  editarDestacado(item: any) {
    console.log('🔵 Editando destacado:', item);
    this.editandoDestacado.set(item.id);
    this.destacadoForm.set({
      nombre: item.nombre || '',
      categoria: item.categoria || '',
      descripcion: item.descripcion || '',
      latitud: Number(item.latitud) || 0,
      longitud: Number(item.longitud) || 0,
      direccion: item.direccion || '',
      horario: item.horario || '',
      precio: item.precio || '',
      imagen_url: item.imagen_url || ''
    });
  }

  cancelarDestacado() {
    console.log('🔵 Cancelando edición de destacado');
    this.editandoDestacado.set(null);
    this.destacadoForm.set({
      nombre: '',
      categoria: '',
      descripcion: '',
      latitud: 0,
      longitud: 0,
      direccion: '',
      horario: '',
      precio: '',
      imagen_url: ''
    });
  }

  async guardarDestacado() {
    const form = this.destacadoForm();
    console.log('🔵 Guardando destacado:', form);
    
    if (!form.nombre || !form.categoria || !form.latitud || !form.longitud) {
      this.error.set('Nombre, categoría, latitud y longitud son requeridos');
      return;
    }

    this.cargando.set(true);
    try {
      if (this.editandoDestacado()) {
        console.log('🔵 Actualizando destacado ID:', this.editandoDestacado());
        await this.admin.updateDestacado(this.editandoDestacado()!, form).toPromise();
        this.exito.set('Lugar destacado actualizado');
      } else {
        console.log('🔵 Creando nuevo destacado');
        await this.admin.createDestacado(form).toPromise();
        this.exito.set('Lugar destacado creado');
      }
      
      await this.cargarDestacados();
      this.cancelarDestacado();
    } catch (err: any) {
      console.error('❌ Error guardando destacado:', err);
      this.error.set(err.error?.error || 'Error guardando destacado');
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarDestacado(id: number) {
    console.log('🔵 Eliminando destacado ID:', id);
    if (!confirm('¿Eliminar este lugar destacado?')) return;
    
    try {
      await this.admin.deleteDestacado(id).toPromise();
      this.exito.set('Lugar destacado eliminado');
      await this.cargarDestacados();
    } catch (err: any) {
      console.error('❌ Error eliminando destacado:', err);
      this.error.set(err.error?.error || 'Error eliminando destacado');
    }
  }

  // ===== ESTADÍSTICAS DE API =====
  async cargarEstadisticasAPI() {
    console.log('🔵 Cargando estadísticas de API...');
    try {
      const data = await this.admin.getApiStats().toPromise();
      if (data) {
        this.apiStats.set(data);
        this.actualizarGraficos(data);
        console.log('✅ Estadísticas de API cargadas:', data);
      }
    } catch (err) {
      console.error('❌ Error cargando estadísticas API:', err);
      this.error.set('Error cargando estadísticas de uso');
    }
  }

  private actualizarGraficos(data: any) {
    // Actualizar gráfico de peticiones por día
    if (this.apiUsageChart && data.byDay && data.byDay.length > 0) {
      const labels = data.byDay.map((d: any) => {
        const fecha = new Date(d.dia);
        return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][fecha.getDay()];
      });
      const values = data.byDay.map((d: any) => d.peticiones);
      
      this.apiUsageChart.data.labels = labels;
      this.apiUsageChart.data.datasets[0].data = values;
      this.apiUsageChart.update();
    }

    // Actualizar gráfico de tokens por día
    if (this.tokensChart && data.byDay && data.byDay.length > 0) {
      const labels = data.byDay.map((d: any) => {
        const fecha = new Date(d.dia);
        return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][fecha.getDay()];
      });
      const values = data.byDay.map((d: any) => d.tokens || 0);
      
      this.tokensChart.data.labels = labels;
      this.tokensChart.data.datasets[0].data = values;
      this.tokensChart.update();
    }
  }

  // ===== PAGINACIÓN =====
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