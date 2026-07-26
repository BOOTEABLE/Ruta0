<div class="admin-container">
  <header class="admin-header">
    <div class="header-left">
      <h1 class="brand-title">Ruta0</h1>
      <span class="header-divider">|</span>
      <h2>Panel de Administración</h2>
    </div>
    <div class="header-right">
      <button class="btn-icon" (click)="theme.alternarTema()" [attr.aria-label]="theme.tema() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
        @if (theme.tema() === 'dark') { ☀ } @else { 🌙 }
      </button>
      <span class="user-info">{{ auth.currentUser()?.nombre }}</span>
      <button class="btn-secondary" (click)="auth.logout()">Cerrar sesión</button>
    </div>
  </header>

  <main class="admin-main">
    <section class="stats-grid">
      <div class="stat-card">
        <span class="stat-number">{{ estadisticas()?.totalUsuarios ?? '—' }}</span>
        <span class="stat-label">Total Usuarios</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ estadisticas()?.totalAdmins ?? '—' }}</span>
        <span class="stat-label">Administradores</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ estadisticas()?.usuariosRecientes ?? '—' }}</span>
        <span class="stat-label">Usuarios Recientes</span>
      </div>
    </section>

    <section class="users-section">
      <div class="section-header">
        <h3>Usuarios</h3>
        <button class="btn-primary" (click)="abrirCrear()">+ Crear Usuario</button>
      </div>

      @if (error()) {
        <div class="error-banner">{{ error() }}</div>
      }

      @if (cargando()) {
        <div class="loading">Cargando usuarios...</div>
      } @else {
        <div class="table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (usuario of usuarios(); track usuario.id) {
                <tr>
                  <td>{{ usuario.nombre }}</td>
                  <td>{{ usuario.email }}</td>
                  <td>
                    <span class="rol-badge" [class]="'rol-' + usuario.rol">{{ usuario.rol === 'admin' ? 'Admin' : 'Usuario' }}</span>
                  </td>
                  <td>{{ usuario.fechaCreacion ? (usuario.fechaCreacion | date:'dd/MM/yyyy') : '—' }}</td>
                  <td class="acciones">
                    <button class="btn-icon-sm" (click)="abrirEditar(usuario)" title="Editar">✏</button>
                    <button class="btn-icon-sm btn-danger" (click)="confirmarEliminar(usuario)" title="Eliminar">🗑</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty-state">No hay usuarios registrados</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  </main>
</div>

@if (showModal()) {
  <div class="modal-overlay" (click)="cerrarModal()">
    <div class="modal-card" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h3>{{ editandoId() ? 'Editar Usuario' : 'Crear Usuario' }}</h3>
        <button class="btn-close" (click)="cerrarModal()">×</button>
      </div>

      @if (formErrores().length > 0) {
        <div class="form-errors">
          @for (err of formErrores(); track err) {
            <p class="form-error">{{ err }}</p>
          }
        </div>
      }

      <form class="modal-form" (ngSubmit)="guardar()">
        <div class="form-group">
          <label for="form-nombre">Nombre</label>
          <input id="form-nombre" type="text" [value]="formNombre()" (input)="actualizarCampo('nombre', $event)" placeholder="Nombre completo" required />
        </div>

        <div class="form-group">
          <label for="form-email">Email</label>
          <input id="form-email" type="email" [value]="formEmail()" (input)="actualizarCampo('email', $event)" placeholder="correo@ejemplo.com" required />
        </div>

        <div class="form-group">
          <label for="form-password">{{ editandoId() ? 'Nueva Contraseña (opcional)' : 'Contraseña' }}</label>
          <input id="form-password" type="password" [value]="formPassword()" (input)="actualizarCampo('password', $event)" placeholder="Mínimo 6 caracteres" [required]="!editandoId()" />
        </div>

        <div class="form-group">
          <label for="form-rol">Rol</label>
          <select id="form-rol" [value]="formRol()" (change)="actualizarCampo('rol', $event)">
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
          <button type="submit" class="btn-primary">{{ editandoId() ? 'Guardar Cambios' : 'Crear Usuario' }}</button>
        </div>
      </form>
    </div>
  </div>
}

@if (showDeleteConfirm()) {
  <div class="modal-overlay" (click)="cancelarEliminar()">
    <div class="modal-card modal-confirm" (click)="$event.stopPropagation()">
      <h3>Confirmar Eliminación</h3>
      <p>¿Estás seguro de que deseas eliminar al usuario <strong>{{ deleteNombre() }}</strong>? Esta acción no se puede deshacer.</p>
      <div class="modal-actions">
        <button class="btn-secondary" (click)="cancelarEliminar()">Cancelar</button>
        <button class="btn-danger" (click)="eliminar()">Eliminar</button>
      </div>
    </div>
  </div>
}
