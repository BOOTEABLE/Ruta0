import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private router = inject(Router);
  public auth = inject(AuthService);

  modoOscuro = signal(localStorage.getItem('modoOscuro') === 'true');

  constructor() {
    effect(() => {
      const oscuro = this.modoOscuro();
      document.documentElement.classList.toggle('dark-mode', oscuro);
      localStorage.setItem('modoOscuro', String(oscuro));
    });
  }

  irAPerfil() {
    this.router.navigate(['/perfil']);
  }
}
