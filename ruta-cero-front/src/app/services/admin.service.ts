import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface CacheStatsResponse {
    totalEntradas: number;
    totalLugares: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    bySource: { source: string; count: number }[];
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
    expiresAt?: string;
    createdAt?: string;
    data?: any;
}

export interface AdminUser {
    id: string;
    email: string;
    nombre: string;
    rol: 'user' | 'admin';
    onboardingCompletado: boolean;
    creado: string;
    actualizado?: string;
}

export interface AdminStats {
    totalUsers: number;
    adminUsers: number;
    usersWithOnboarding: number;
    recentUsers: AdminUser[];
}

export interface UserResponse {
    total: number;
    usuarios: AdminUser[];
}

export interface CacheEntriesResponse {
    total: number;
    entradas: CacheEntry[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private http = inject(HttpClient);
    private API = environment.apiUrl;

    // Cache endpoints
    getCacheStats() {
        return this.http.get<CacheStatsResponse>(`${this.API}/admin/lugares-cache/stats`);
    }

    getCacheEntries(page = 1, limit = 50) {
        return this.http.get<CacheEntriesResponse>(
            `${this.API}/admin/lugares-cache`, 
            { params: { page: page.toString(), limit: limit.toString() } }
        );
    }

    clearCache() {
        return this.http.delete<{ mensaje: string; eliminadas: number }>(`${this.API}/admin/cache`);
    }

    deleteCacheEntry(cacheKey: string) {
        return this.http.delete<{ mensaje: string }>(`${this.API}/admin/cache/${encodeURIComponent(cacheKey)}`);
    }

    // User management
    getUsers(page = 1, limit = 20) {
        return this.http.get<UserResponse>(
            `${this.API}/admin/usuarios`, 
            { params: { page: page.toString(), limit: limit.toString() } }
        );
    }

    getAdminStats() {
        return this.http.get<AdminStats>(`${this.API}/admin/usuarios/stats`);
    }

    updateUserRole(userId: string, rol: 'user' | 'admin') {
        return this.http.put<{ user: AdminUser }>(`${this.API}/admin/usuarios/${userId}/rol`, { rol });
    }

    deleteUser(userId: string) {
        return this.http.delete<{ message: string }>(`${this.API}/admin/usuarios/${userId}`);
    }
}