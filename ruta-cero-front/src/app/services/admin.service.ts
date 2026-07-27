import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

// ===== INTERFACES =====

export interface CacheStatsResponse {
    totalEntradas: number;
    totalLugares: number;
    entradas: CacheEntrySummary[];
}

export interface CacheEntrySummary {
    cacheKey: string;
    lugares: number;
    expira: string;
    creada: string;
}

export interface CacheEntry {
    cacheKey: string;
    lugares: any[];
    expira: string;
    creada: string;
    source?: string;
    data?: any;
}

export interface AdminUser {
    id: number;
    email: string;
    nombre: string;
    rol: 'user' | 'admin';
    onboardingCompletado: boolean;
    creado: string;
    actualizado?: string;
}

export interface AdminStats {
    totalUsuarios: number;
    adminUsuarios: number;
    usuariosSinOnboarding: number;
    usuarios: AdminUser[];
}

export interface UserResponse {
    total: number;
    usuarios: AdminUser[];
}

export interface CacheEntriesResponse {
    total: number;
    entradas: CacheEntry[];
}

export interface Destacado {
    id: number;
    nombre: string;
    categoria: string;
    descripcion: string;
    latitud: number;
    longitud: number;
    direccion: string;
    horario: string;
    precio: string;
    imagen_url: string;
    activo: boolean;
    orden: number;
    created_at: string;
    updated_at: string;
    usuario_id?: number;
    usuario_nombre?: string;
    usuario_email?: string;
}

export interface ApiStatsResponse {
    summary: {
        totalPeticiones: number;
        totalTokens: number;
        avgTiempo: number;
        peticionesExitosas: number;
        usuariosActivos: number;
    };
    byEndpoint: { endpoint: string; total: number; avg_tiempo: number; tokens: number }[];
    byDay: { dia: string; peticiones: number; tokens: number }[];
    cache: { tipo: string; accion: string; total: number }[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private http = inject(HttpClient);
    private API = environment.apiUrl;

    // ===== CACHÉ =====
    getCacheStats() {
        return this.http.get<CacheStatsResponse>(`${this.API}/admin/cache/stats`);
    }

    getCacheEntries(page = 1, limit = 50) {
        return this.http.get<CacheEntriesResponse>(
            `${this.API}/admin/cache/lugares`,
            { params: { page: page.toString(), limit: limit.toString() } }
        );
    }

    clearCache() {
        return this.http.post<{ mensaje: string; eliminadas: number }>(
            `${this.API}/admin/cache/clear`,
            {}
        );
    }

    refreshCache() {
        return this.http.post<{ mensaje: string; eliminadas: number }>(
            `${this.API}/admin/cache/refresh`,
            {}
        );
    }

    deleteCacheEntry(cacheKey: string) {
        return this.http.post<{ mensaje: string; eliminadas: number }>(
            `${this.API}/admin/cache/clear`,
            { cacheKey }
        );
    }

    // ===== USUARIOS =====
    getUsers(page = 1, limit = 20) {
        return this.http.get<UserResponse>(
            `${this.API}/admin/usuarios`,
            { params: { page: page.toString(), limit: limit.toString() } }
        );
    }

    getAdminStats() {
        return this.http.get<AdminStats>(`${this.API}/admin/usuarios/stats`);
    }

    updateUserRole(userId: number | string, rol: 'user' | 'admin') {
        return this.http.patch<{ mensaje: string; usuario: AdminUser }>(
            `${this.API}/admin/usuarios/${userId}/rol`,
            { rol }
        );
    }

    deleteUser(userId: number | string) {
        return this.http.delete<{ message: string }>(
            `${this.API}/admin/usuarios/${userId}`
        );
    }

    // ===== DESTACADOS (TODOS LOS USUARIOS) =====
    
    // Obtener mis destacados (usuario actual)
    getMisDestacados() {
        return this.http.get<{ destacados: Destacado[] }>(`${this.API}/admin/destacados/mis`);
    }

    // Obtener TODOS los destacados (solo admin)
    getAllDestacados() {
        return this.http.get<{ destacados: Destacado[] }>(`${this.API}/admin/destacados/todos`);
    }

    // Crear destacado
    createDestacado(data: Partial<Destacado>) {
        return this.http.post<{ mensaje: string; destacado: Destacado }>(
            `${this.API}/admin/destacados`, 
            data
        );
    }

    // Actualizar destacado
    updateDestacado(id: number, data: Partial<Destacado>) {
        return this.http.put<{ mensaje: string; destacado: Destacado }>(
            `${this.API}/admin/destacados/${id}`, 
            data
        );
    }

    // Eliminar destacado
    deleteDestacado(id: number) {
        return this.http.delete<{ mensaje: string }>(
            `${this.API}/admin/destacados/${id}`
        );
    }

    // ===== ESTADÍSTICAS DE API =====
    getApiStats() {
        return this.http.get<ApiStatsResponse>(`${this.API}/admin/stats/api`);
    }
}