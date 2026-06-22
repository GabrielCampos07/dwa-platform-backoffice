import { Component, input } from '@angular/core';

@Component({
  selector: 'app-data-table',
  template: `
    @if (error()) {
      <p class="banner banner--error">{{ error() }}</p>
    } @else if (loading()) {
      <p class="data-table__loading">{{ loadingMessage() }}</p>
    } @else if (empty()) {
      <div class="empty">
        <p>{{ emptyMessage() }}</p>
        <ng-content select="[emptyAction]" />
      </div>
    } @else {
      <div class="table-card">
        <div class="table-wrap">
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    .data-table__loading {
      margin: 0;
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
    }

    .table-card {
      background: var(--dwa-bg-elevated);
      border: 1px solid #333;
      border-radius: var(--dwa-radius-lg);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .empty {
      padding: 2rem;
      text-align: center;
      background: var(--dwa-bg-elevated);
      border-radius: var(--dwa-radius-lg);
      border: 1px dashed rgba(255, 255, 255, 0.1);
    }

    .empty p {
      margin: 0;
      color: var(--dwa-text-muted);
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }
  `,
})
export class DataTableComponent {
  readonly loading = input(false);
  readonly error = input('');
  readonly empty = input(false);
  readonly loadingMessage = input('Carregando…');
  readonly emptyMessage = input('Nenhum registro encontrado.');
}
