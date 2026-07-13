import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard  {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (this.auth.haySesion()) return true;
    this.router.navigate(['/login']);
    return false;
  }
}
