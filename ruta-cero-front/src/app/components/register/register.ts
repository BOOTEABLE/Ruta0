import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  nombre = signal('');
  email = signal('');
  password = signal('');
  confirmarPassword = signal('');
  cargando = signal(false);
  errores = signal<string[]>([]);

  actualizarCampo(campo: string, event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    (this as any)[campo].set(valor);
  }

  async registrar() {
    this.errores.set([]);
    this.cargando.set(true);

    const errs: string[] = [];
    if (!this.nombre().trim()) errs.push('El nombre es requerido');
    if (!this.email().trim()) errs.push('El email es requerido');
    if (!this.password()) errs.push('La contraseña es requerida');
    if (this.password().length < 6) errs.push('La contraseña debe tener al menos 6 caracteres');
    if (this.password() !== this.confirmarPassword()) errs.push('Las contraseñas no coinciden');

    if (errs.length > 0) {
      this.errores.set(errs);
      this.cargando.set(false);
      return;
    }

    try {
      await this.auth.registro(this.nombre().trim(), this.email().trim(), this.password(), this.confirmarPassword()).toPromise();
      this.router.navigate(['/']);
    } catch (error: any) {
      this.errores.set([error.error?.error || 'Error al registrarse']);
    } finally {
      this.cargando.set(false);
    }
  }
}