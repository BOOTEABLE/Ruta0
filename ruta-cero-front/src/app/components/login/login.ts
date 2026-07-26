<div class="login-wrapper">
  <div class="login-card">
    <div class="login-header">
      <div class="logo">
        <span class="logo-ruta">Ruta</span><span class="logo-zero">0</span>
      </div>
      <p class="tagline">Tu guía turístico en Quito</p>
    </div>

    <form (ngSubmit)="login()" class="login-form" autocomplete="off">
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="tu@email.com"
          [value]="email()"
          (input)="actualizarEmail($event)"
          autocomplete="email"
        />
      </div>

      <div class="form-group">
        <label for="password">Contraseña</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          [value]="password()"
          (input)="actualizarPassword($event)"
          (keydown.enter)="login()"
          autocomplete="current-password"
        />
      </div>

      <div *ngIf="errores().length > 0" class="error-box">
        <p *ngFor="let err of errores()">{{ err }}</p>
      </div>

      <button type="submit" class="btn-login" [disabled]="cargando()">
        <span *ngIf="!cargando()">Iniciar Sesión</span>
        <span *ngIf="cargando()" class="spinner"></span>
      </button>
    </form>

    <div class="login-footer">
      <p>¿No tienes cuenta? <a routerLink="/register">Regístrate</a></p>
    </div>
  </div>
</div>
