@if (expanded) {
  <div class="a11y-backdrop" (click)="toggleExpanded()"></div>
}

<div class="a11y-toolbar" [class.expanded]="expanded">
  @if (expanded) {
    <div class="a11y-panel">
      <div class="a11y-section">
        <span class="a11y-section-label">Tema</span>
        <button class="a11y-option" [class.active]="theme.tema() === 'light'" (click)="theme.setTema('light')" title="Modo claro">
          ☀
        </button>
        <button class="a11y-option" [class.active]="theme.tema() === 'dark'" (click)="theme.setTema('dark')" title="Modo oscuro">
          🌙
        </button>
      </div>

      <div class="a11y-divider"></div>

      <div class="a11y-section">
        <span class="a11y-section-label">Tamaño de fuente</span>
        <button class="a11y-option-text" [class.active]="theme.tamanoFuente() === 'normal'" (click)="theme.setTamanoFuente('normal')">
          A
        </button>
        <button class="a11y-option-text a11y-large" [class.active]="theme.tamanoFuente() === 'grande'" (click)="theme.setTamanoFuente('grande')">
          A
        </button>
        <button class="a11y-option-text a11y-xlarge" [class.active]="theme.tamanoFuente() === 'extra-grande'" (click)="theme.setTamanoFuente('extra-grande')">
          A
        </button>
      </div>
    </div>
  }

  <button class="a11y-fab" (click)="toggleExpanded()" [attr.aria-label]="expanded ? 'Cerrar panel de accesibilidad' : 'Abrir panel de accesibilidad'">
    ♿
  </button>
</div>
