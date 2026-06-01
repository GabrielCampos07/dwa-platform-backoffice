import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LabelRecord, LabelsApiService } from '../../core/api/labels-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';

@Component({
  selector: 'app-labels-list-page',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div class="page-header__row">
        <div>
          <h1>Labels</h1>
          <p>
            White-label connections — escopo
            <code>{{ context.scopeLabel() }}</code>
          </p>
        </div>
        <a routerLink="/labels/new" class="btn-primary">Nova label</a>
      </div>
    </header>

    @if (!context.hasScope()) {
      <p class="banner banner--warn">
        Defina <strong>tenantId</strong> e <strong>productId</strong> na barra de contexto acima para
        filtrar a lista.
      </p>
    }

    @if (loadError()) {
      <p class="banner banner--error">{{ loadError() }}</p>
    } @else if (loading()) {
      <p>Carregando labels…</p>
    } @else if (!labels().length) {
      <div class="empty">
        <p>Nenhuma label encontrada para o escopo atual.</p>
        <a routerLink="/labels/new" class="link">Criar primeira label →</a>
      </div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Slug</th>
              <th>Nome</th>
              <th>Ativa</th>
              <th>Escopo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (label of labels(); track label.id) {
              <tr>
                <td><code>{{ label.slug }}</code></td>
                <td>{{ label.name }}</td>
                <td>
                  <span class="badge" [class.badge--on]="label.isActive" [class.badge--off]="!label.isActive">
                    {{ label.isActive ? 'Sim' : 'Não' }}
                  </span>
                </td>
                <td class="muted">
                  <code>{{ label.tenantId }}/{{ label.productId }}</code>
                </td>
                <td class="actions">
                  <a [routerLink]="['/labels', label.id]">Editar</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .page-header__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .page-header h1 {
      margin: 0 0 0.25rem;
      font-family: var(--dwa-font-display);
    }

    .page-header p {
      margin: 0;
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
    }

    .table-wrap {
      overflow-x: auto;
      border-radius: var(--dwa-radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .data-table th,
    .data-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .data-table th {
      background: var(--dwa-bg-muted);
      color: var(--dwa-text-muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge--on {
      background: rgba(82, 224, 160, 0.15);
      color: var(--dwa-success);
    }

    .badge--off {
      background: rgba(163, 163, 163, 0.15);
      color: var(--dwa-text-muted);
    }

    .actions a {
      color: var(--dwa-gold-highlight);
      text-decoration: none;
      font-weight: 600;
    }

    .muted {
      color: var(--dwa-text-muted);
    }

    .empty {
      padding: 2rem;
      text-align: center;
      background: var(--dwa-bg-elevated);
      border-radius: var(--dwa-radius-lg);
      border: 1px dashed rgba(255, 255, 255, 0.1);
    }

    .link {
      color: var(--dwa-gold-highlight);
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .banner--warn {
      background: rgba(255, 200, 87, 0.12);
      color: var(--dwa-warning);
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }
  `,
})
export class LabelsListPageComponent implements OnInit {
  private readonly api = inject(LabelsApiService);
  readonly context = inject(PlatformContextService);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly labels = signal<LabelRecord[]>([]);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set('');

    const filters = this.context.hasScope()
      ? { tenantId: this.context.tenantId(), productId: this.context.productId() }
      : undefined;

    this.api.list(filters).subscribe({
      next: (res) => {
        this.labels.set(res.labels);
        this.loading.set(false);
      },
      error: (err) => {
        const msg =
          err?.status === 404
            ? 'Endpoint de labels ainda não disponível na API.'
            : err?.status === 401
              ? 'Chave de API inválida.'
              : (err?.error?.message ?? 'Falha ao carregar labels.');
        this.loadError.set(msg);
        this.loading.set(false);
      },
    });
  }
}
