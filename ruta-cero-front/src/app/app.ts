import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from './services/store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  private store = inject(Store);

  ngOnInit() {
    this.store.restaurarSesion();
  }

  title = 'ruta-cero-front';
}