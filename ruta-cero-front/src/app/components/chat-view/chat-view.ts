import { Component, inject, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store, Mensaje } from '../../services/store';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-view.html',
  styleUrl: './chat-view.css',
})
export class ChatView {
  private store = inject(Store);
  private api = inject(ApiService);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  historial = this.store.historialChat;
  procesandoMensaje = false;

  private miLatitud: number | null = null;
  private miLongitud: number | null = null;

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.miLatitud = pos.coords.latitude;
          this.miLongitud = pos.coords.longitude;
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }

  enviarMensaje(texto: string, input: HTMLInputElement) {
    if (!texto?.trim() || this.procesandoMensaje) return;
    input.value = '';
    this.procesandoMensaje = true;

    this.historial.update((h) => [...h, { emisor: 'usuario', texto: texto.trim() }]);

    const payload = {
      mensaje: texto.trim(),
      lat: this.miLatitud,
      lng: this.miLongitud,
      historial: this.historial(),
    };

    this.api.post<any>('/api/chat', payload).subscribe({
      next: (res) => {
        const respuesta = res?.respuesta || 'Recibí los datos...';
        this.historial.update((h) => [...h, { emisor: 'bot', texto: respuesta }]);

        if (res.lugaresFisicos?.length) {
          this.store.lugaresRecomendados.set(
            res.lugaresFisicos.map((l: any) => ({
              ...l,
              latitud: Number(l.latitud),
              longitud: Number(l.longitud),
            }))
          );
        } else {
          this.store.lugaresRecomendados.set([]);
        }

        this.procesandoMensaje = false;
        setTimeout(() => this.scrollAlFinal(), 50);
      },
      error: () => {
        this.historial.update((h) => [
          ...h,
          { emisor: 'bot', texto: 'Upps, no pude conectar con el servidor.' },
        ]);
        this.procesandoMensaje = false;
      },
    });
  }

  formatearMensaje(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  private scrollAlFinal() {
    try {
      this.messagesContainer?.nativeElement?.scrollTo({
        top: this.messagesContainer.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    } catch {}
  }
}
