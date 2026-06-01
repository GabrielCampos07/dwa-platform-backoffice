import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-brand-config-stub-page',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <h1>Brand config</h1>
      <p class="muted">Tema, assets e defaults de locale por label (white-label).</p>
    </header>
    <div class="stub">
      <p>
        O campo <code>brandConfig</code> de cada label armazena tokens de tema, URLs de assets e
        overrides de copy para builds CI/CD. Edite via
        <a routerLink="/labels">Labels</a> — crie ou abra uma label e use o editor JSON.
      </p>
      <p>
        Use <strong>Exportar bundle</strong> na página de detalhe da label para obter o payload
        completo (<code>GET /internal/v1/labels/:id/export</code>).
      </p>
      <a routerLink="/labels/new" class="platform-btn-add" aria-label="Nova label com brandConfig">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
      </a>
    </div>
  `,
  styles: `
    .page-header h1 {
      margin: 0 0 0.25rem;
      font-family: var(--dwa-font-display);
    }

    .muted {
      color: var(--dwa-text-muted);
    }

    .stub {
      padding: 1.5rem;
      background: var(--dwa-bg-elevated);
      border-radius: var(--dwa-radius-lg);
      border: 1px dashed rgba(201, 162, 39, 0.3);
      font-size: 0.875rem;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    a:not(.platform-btn-add) {
      color: var(--dwa-gold-highlight);
    }
  `,
})
export class BrandConfigStubPageComponent {}
