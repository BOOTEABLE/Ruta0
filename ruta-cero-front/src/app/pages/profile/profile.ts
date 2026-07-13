import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '../../services/store';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent {
  private store = inject(Store);
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = this.store.usuario;

  cerrarSesion() {
    this.auth.logout();
  }

  irAlDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
