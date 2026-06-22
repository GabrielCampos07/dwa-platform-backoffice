import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
            <strong>{{ context.scopeLabel() }}</strong>
          </p>
        </div>
        <a routerLink="/labels/new" class="create-btn">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>
          <span>Criar nova label</span>
        </a>
      </div>
    </header>

    @if (!context.hasValidLabelScope()) {
      <p class="banner banner--warn">
        Selecione uma <strong>conta</strong> no topo da página para filtrar labels do escopo.
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
      <div class="table-card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome da label</th>
                <th>Status</th>
                <th>Cor primária</th>
                <th>Escopo</th>
                <th class="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (label of labels(); track label.id) {
                <tr>
                  <td>
                    <div class="name-cell">
                      <span
                        class="name-cell__bar"
                        [style.background]="primaryColor(label) ?? 'var(--dwa-gold-primary)'"
                      ></span>
                      <span class="name-cell__text">
                        <span class="name-cell__name">{{ label.name }}</span>
                        <span class="name-cell__slug"><code>{{ label.slug }}</code></span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge--on]="label.isActive"
                      [class.badge--off]="!label.isActive"
                    >
                      {{ label.isActive ? 'Ativa' : 'Inativa' }}
                    </span>
                  </td>
                  <td>
                    @if (primaryColor(label); as color) {
                      <span class="color-cell">
                        <span class="color-cell__swatch" [style.background]="color"></span>
                        <code>{{ color }}</code>
                      </span>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                  <td class="muted">
                    <code>{{ label.tenantId }}/{{ label.productId }}</code>
                  </td>
                  <td>
                    <div class="row-actions">
                      <a
                        class="row-action"
                        [routerLink]="['/labels', label.id]"
                        [attr.aria-label]="'Editar ' + label.name"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                      </a>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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

    .create-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: var(--dwa-radius-md);
      background: var(--dwa-gold-primary);
      color: #000;
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 0 15px rgba(201, 162, 39, 0.2);
      transition: background 0.15s ease;
      white-space: nowrap;
    }

    .create-btn:hover {
      background: var(--dwa-gold-highlight);
    }

    .create-btn .material-symbols-outlined {
      font-size: 1.125rem;
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

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .data-table th,
    .data-table td {
      padding: 1rem 1.5rem;
      text-align: left;
      border-bottom: 1px solid #333;
    }

    .data-table th {
      background: rgba(26, 26, 26, 0.5);
      color: var(--dwa-text-muted);
      font-weight: 700;
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .th-actions {
      text-align: right;
    }

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .name-cell__bar {
      width: 4px;
      align-self: stretch;
      min-height: 2rem;
      border-radius: 999px;
      flex-shrink: 0;
    }

    .name-cell__text {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .name-cell__name {
      font-weight: 700;
      color: var(--dwa-text-primary);
    }

    .name-cell__slug code {
      font-size: 0.6875rem;
    }

    .color-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .color-cell__swatch {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 6px;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge--on {
      background: rgba(82, 224, 160, 0.1);
      border: 1px solid rgba(82, 224, 160, 0.2);
      color: var(--dwa-success);
    }

    .badge--off {
      background: rgba(163, 163, 163, 0.1);
      border: 1px solid rgba(163, 163, 163, 0.2);
      color: var(--dwa-text-muted);
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .row-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid #333;
      border-radius: var(--dwa-radius-md);
      background: var(--dwa-bg-void);
      color: var(--dwa-text-muted);
      text-decoration: none;
      transition:
        color 0.15s ease,
        border-color 0.15s ease;
    }

    .row-action:hover {
      color: var(--dwa-gold-highlight);
      border-color: rgba(201, 162, 39, 0.4);
    }

    .row-action .material-symbols-outlined {
      font-size: 1rem;
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
  private readonly destroyRef = inject(DestroyRef);
  readonly context = inject(PlatformContextService);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly labels = signal<LabelRecord[]>([]);

  ngOnInit(): void {
    this.reload();
    this.context.scopeChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
  }

  /** Best-effort extraction of a hex primary color from a label's brandConfig. */
  primaryColor(label: LabelRecord): string | null {
    const cfg = label.brandConfig as Record<string, any> | null | undefined;
    const candidate =
      cfg?.['theme']?.['primary'] ??
      cfg?.['theme']?.['colors']?.['primary'] ??
      cfg?.['colors']?.['primary'] ??
      cfg?.['primaryColor'] ??
      cfg?.['primary'];
    if (typeof candidate !== 'string') {
      return null;
    }
    const value = candidate.trim();
    if (!/^#?[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?$/.test(value)) {
      return null;
    }
    return value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set('');

    const filters = this.context.hasValidLabelScope()
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
