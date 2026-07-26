import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  cargando = signal(false);
  errores = signal<string[]>([]);

  actualizarEmail(event: Event) {
    this.email.set((event.target as HTMLInputElement).value);
  }

  actualizarPassword(event: Event) {
    this.password.set((event.target as HTMLInputElement).value);
  }

  async login() {
    this.errores.set([]);
    this.cargando.set(true);

    if (!this.email().trim() || !this.password()) {
      this.errores.set(['Email y contraseña son requeridos']);
      this.cargando.set(false);
      return;
    }

    try {
      await this.auth.login(this.email().trim(), this.password()).toPromise();
      this.router.navigate(['/']);
    } catch (error: any) {
      this.errores.set([error.error?.error || 'Error al iniciar sesión']);
    } finally {
      this.cargando.set(false);
    }
  }
}