import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private auth = inject(AuthService);

  email = '';
  password = '';
  error = '';
  cargando = false;

  ingresar() {
    if (!this.email || !this.password) {
      this.error = 'Completa todos los campos';
      return;
    }
    this.cargando = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      error: (err) => {
        this.error = err.error?.error || 'Error al iniciar sesión';
        this.cargando = false;
      }
    });
  }
}
