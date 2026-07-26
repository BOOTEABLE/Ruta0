<div class="profile-container">
  <header class="profile-header">
    <div class="header-left">
      <a routerLink="/dashboard" class="back-link">← Dashboard</a>
      <h1>Mi Perfil</h1>
    </div>
    <div class="header-right">
      <button class="btn-icon" (click)="theme.alternarTema()">
        @if (theme.tema() === 'dark') { ☀ } @else { 🌙 }
      </button>
      <button class="btn-secondary" (click)="auth.logout()">Cerrar sesión</button>
    </div>
  </header>

  <nav class="tabs">
    <button class="tab" [class.active]="activeTab() === 'perfil'" (click)="activeTab.set('perfil')">Perfil</button>
    <button class="tab" [class.active]="activeTab() === 'historial'" (click)="activeTab.set('historial')">Historial</button>
    <button class="tab" [class.active]="activeTab() === 'favoritos'" (click)="activeTab.set('favoritos')">Favoritos</button>
    <button class="tab" [class.active]="activeTab() === 'preferencias'" (click)="activeTab.set('preferencias')">Preferencias</button>
  </nav>

  <main class="profile-main">
    @if (cargando()) {
      <div class="loading">Cargando...</div>
    }

    <!-- Perfil Tab -->
    @if (activeTab() === 'perfil') {
      <section class="tab-content">
        @if (!editando()) {
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Nombre</span>
              <span class="info-value">{{ auth.currentUser()?.nombre }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">{{ auth.currentUser()?.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Rol</span>
              <span class="info-value rol-badge" [class]="'rol-' + auth.currentUser()?.rol">
                {{ auth.currentUser()?.rol === 'admin' ? 'Administrador' : 'Usuario' }}
              </span>
            </div>
            <button class="btn-primary" (click)="iniciarEdicion()">Editar Perfil</button>
          </div>
        } @else {
          <div class="info-card">
            <h3>Editar Perfil</h3>

            @if (perfilErrores().length > 0) {
              <div class="form-errors">
                @for (err of perfilErrores(); track err) {
                  <p class="form-error">{{ err }}</p>
                }
              </div>
            }

            <form class="edit-form" (ngSubmit)="guardarPerfil()">
              <div class="form-group">
                <label for="edit-nombre">Nombre</label>
                <input id="edit-nombre" type="text" [value]="editNombre()" (input)="actualizarCampo('nombre', $event)" />
              </div>
              <div class="form-group">
                <label for="edit-email">Email</label>
                <input id="edit-email" type="email" [value]="editEmail()" (input)="actualizarCampo('email', $event)" />
              </div>
              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="cancelarEdicion()">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        }
      </section>
    }

    <!-- Historial Tab -->
    @if (activeTab() === 'historial') {
      <section class="tab-content">
        @if (historial().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">📍</span>
            <p>No tienes lugares en tu historial aún.</p>
          </div>
        } @else {
          <div class="timeline">
            @for (entry of historial(); track entry.fecha) {
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <h4>{{ entry.lugar }}</h4>
                  <time>{{ formatearFecha(entry.fecha) }}</time>
                </div>
              </div>
            }
          </div>
        }
      </section>
    }

    <!-- Favoritos Tab -->
    @if (activeTab() === 'favoritos') {
      <section class="tab-content">
        @if (favoritos().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">⭐</span>
            <p>No tienes lugares favoritos aún.</p>
          </div>
        } @else {
          <div class="favorites-grid">
            @for (fav of favoritos(); track fav.id ?? fav.nombre) {
              <div class="favorite-card">
                <div class="fav-info">
                  <h4>{{ fav.nombre }}</h4>
                  @if (fav.categoria) {
                    <span class="fav-category">{{ fav.categoria }}</span>
                  }
                  @if (fav.descripcion) {
                    <p class="fav-desc">{{ fav.descripcion }}</p>
                  }
                </div>
                <button class="btn-icon-sm btn-danger" (click)="eliminarFavorito(fav)" title="Eliminar de favoritos">✕</button>
              </div>
            }
          </div>
        }
      </section>
    }

    <!-- Preferencias Tab -->
    @if (activeTab() === 'preferencias') {
      <section class="tab-content">
        <div class="info-card">
          <h3>Preferencias de Visualización</h3>

          <div class="pref-group">
            <label class="pref-label">Tema</label>
            <div class="pref-options">
              <button class="pref-btn" [class.active]="theme.tema() === 'light'" (click)="theme.setTema('light')">☀ Claro</button>
              <button class="pref-btn" [class.active]="theme.tema() === 'dark'" (click)="theme.setTema('dark')">🌙 Oscuro</button>
            </div>
          </div>

          <div class="pref-group">
            <label class="pref-label">Tamaño de Fuente</label>
            <div class="pref-options">
              <button class="pref-btn" [class.active]="theme.tamanoFuente() === 'normal'" (click)="theme.setTamanoFuente('normal')">Normal</button>
              <button class="pref-btn" [class.active]="theme.tamanoFuente() === 'grande'" (click)="theme.setTamanoFuente('grande')">Grande</button>
              <button class="pref-btn" [class.active]="theme.tamanoFuente() === 'extra-grande'" (click)="theme.setTamanoFuente('extra-grande')">Extra Grande</button>
            </div>
          </div>

          <button class="btn-primary" (click)="guardarPreferencias()" style="margin-top: 20px;">Guardar Preferencias</button>
        </div>
      </section>
    }
  </main>
</div>
