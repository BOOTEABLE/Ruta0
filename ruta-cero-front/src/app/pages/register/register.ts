import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private auth = inject(AuthService);

  nombre = '';
  email = '';
  password = '';
  confirmar = '';
  error = '';
  cargando = false;

  registrarse() {
    if (!this.nombre || !this.email || !this.password) {
      this.error = 'Completa todos los campos';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.password !== this.confirmar) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    this.cargando = true;
    this.error = '';
    this.auth.register(this.nombre, this.email, this.password).subscribe({
      error: (err) => {
        this.error = err.error?.error || 'Error al registrarse';
        this.cargando = false;
      }
    });
  }
}
