import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  IdentityReviewApiService,
  IdentityReviewDecision,
  IdentityReviewRecord,
} from '../../core/api/identity-review-api.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type PendingAction = {
  review: IdentityReviewRecord;
  decision: IdentityReviewDecision;
};

@Component({
  selector: 'app-identity-review-page',
  imports: [DatePipe, PageHeaderComponent, DataTableComponent, ConfirmDialogComponent],
  template: `
    <app-page-header
      title="Revisão de identidade"
      description="Aprove ou rejeite documentos CNPJ/CPF pendentes de provisionamento."
    />

    <app-data-table
      [loading]="loading()"
      [error]="loadError()"
      [empty]="!loading() && !loadError() && !reviews().length"
      loadingMessage="Carregando revisões pendentes…"
      emptyMessage="Nenhuma revisão de identidade pendente."
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Documento</th>
            <th>Tipo</th>
            <th>Escopo</th>
            <th>Enviado em</th>
            <th class="th-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (review of reviews(); track review.labelId) {
            <tr [class.row-expanded]="expandedId() === review.labelId">
              <td>
                <span class="name">{{ review.labelName ?? review.labelId }}</span>
                <span class="muted"><code>{{ review.labelId }}</code></span>
              </td>
              <td><code>{{ review.document }}</code></td>
              <td>{{ review.documentType }}</td>
              <td class="muted">
                @if (review.tenantId && review.productId) {
                  <code>{{ review.tenantId }}/{{ review.productId }}</code>
                } @else {
                  —
                }
              </td>
              <td class="muted">
                @if (review.submittedAt) {
                  {{ review.submittedAt | date: 'dd/MM/yyyy HH:mm' }}
                } @else {
                  —
                }
              </td>
              <td>
                <div class="row-actions">
                  <button
                    type="button"
                    class="btn-ghost btn-sm"
                    (click)="toggleExpand(review.labelId)"
                  >
                    {{ expandedId() === review.labelId ? 'Ocultar' : 'Detalhes' }}
                  </button>
                  <button
                    type="button"
                    class="btn-ghost btn-sm"
                    [disabled]="submitting()"
                    (click)="openConfirm(review, 'approve')"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    class="btn-danger btn-sm"
                    [disabled]="submitting()"
                    (click)="openConfirm(review, 'reject')"
                  >
                    Rejeitar
                  </button>
                </div>
              </td>
            </tr>
            @if (expandedId() === review.labelId) {
              <tr class="detail-row">
                <td colspan="6">
                  <div class="detail-panel">
                    <h3>Documento para revisão</h3>
                    <dl class="detail-grid">
                      <div>
                        <dt>Tipo</dt>
                        <dd>{{ review.documentType }}</dd>
                      </div>
                      <div>
                        <dt>Número</dt>
                        <dd><code>{{ review.document }}</code></dd>
                      </div>
                      <div>
                        <dt>Label</dt>
                        <dd>{{ review.labelName ?? review.labelId }}</dd>
                      </div>
                      <div>
                        <dt>ID da label</dt>
                        <dd><code>{{ review.labelId }}</code></dd>
                      </div>
                      @if (review.tenantId) {
                        <div>
                          <dt>Tenant</dt>
                          <dd><code>{{ review.tenantId }}</code></dd>
                        </div>
                      }
                      @if (review.productId) {
                        <div>
                          <dt>Produto</dt>
                          <dd><code>{{ review.productId }}</code></dd>
                        </div>
                      }
                      <div>
                        <dt>Enviado em</dt>
                        <dd>
                          @if (review.submittedAt) {
                            {{ review.submittedAt | date: 'dd/MM/yyyy HH:mm:ss' }}
                          } @else {
                            —
                          }
                        </dd>
                      </div>
                    </dl>
                    <p class="detail-hint">
                      Confira o documento acima antes de aprovar ou rejeitar o provisionamento.
                    </p>
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </app-data-table>

    @if (actionMessage()) {
      <p class="banner" [class.banner--ok]="actionOk()" [class.banner--error]="!actionOk()">
        {{ actionMessage() }}
      </p>
    }

    <app-confirm-dialog
      [open]="confirmOpen()"
      [title]="confirmTitle()"
      [message]="confirmMessage()"
      [showReason]="true"
      reasonLabel="Motivo (opcional)"
      reasonPlaceholder="Descreva o motivo da decisão…"
      [confirmLabel]="pendingAction()?.decision === 'reject' ? 'Rejeitar' : 'Aprovar'"
      cancelLabel="Cancelar"
      (confirmedWithReason)="submitDecision($event)"
      (cancelled)="closeConfirm()"
    />
  `,
  styles: `
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
      vertical-align: top;
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

    .name {
      display: block;
      font-weight: 700;
      color: var(--dwa-text-primary);
    }

    .muted {
      display: block;
      color: var(--dwa-text-muted);
      font-size: 0.75rem;
      margin-top: 0.125rem;
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .btn-danger {
      padding: 0.375rem 0.75rem;
      border: 1px solid rgba(248, 113, 113, 0.35);
      border-radius: var(--dwa-radius-md);
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      margin-top: 1rem;
    }

    .banner--ok {
      background: rgba(82, 224, 160, 0.12);
      color: var(--dwa-success);
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }

    .detail-row td {
      padding: 0 1.5rem 1rem;
      background: rgba(201, 162, 39, 0.04);
      border-bottom: 1px solid #333;
    }

    .detail-panel {
      padding: 1rem 1.25rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(201, 162, 39, 0.2);
      border-radius: var(--dwa-radius-md);
    }

    .detail-panel h3 {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--dwa-text-muted);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem 1.25rem;
      margin: 0;
    }

    .detail-grid dt {
      margin: 0 0 0.125rem;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .detail-grid dd {
      margin: 0;
      font-size: 0.875rem;
    }

    .detail-hint {
      margin: 0.75rem 0 0;
      font-size: 0.8125rem;
      color: var(--dwa-warning);
    }
  `,
})
export class IdentityReviewPageComponent implements OnInit {
  private readonly api = inject(IdentityReviewApiService);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly reviews = signal<IdentityReviewRecord[]>([]);
  readonly submitting = signal(false);
  readonly confirmOpen = signal(false);
  readonly pendingAction = signal<PendingAction | null>(null);
  readonly actionMessage = signal('');
  readonly actionOk = signal(false);
  readonly expandedId = signal<string | null>(null);

  readonly confirmTitle = signal('');
  readonly confirmMessage = signal('');

  ngOnInit(): void {
    this.reload();
  }

  toggleExpand(labelId: string): void {
    this.expandedId.update((current) => (current === labelId ? null : labelId));
  }

  openConfirm(review: IdentityReviewRecord, decision: IdentityReviewDecision): void {
    this.pendingAction.set({ review, decision });
    this.actionMessage.set('');

    if (decision === 'approve') {
      this.confirmTitle.set('Aprovar identidade');
      this.confirmMessage.set(
        `Aprovar o documento ${review.documentType} ${review.document} da label "${review.labelName ?? review.labelId}"?`,
      );
    } else {
      this.confirmTitle.set('Rejeitar identidade');
      this.confirmMessage.set(
        `Rejeitar o documento ${review.documentType} ${review.document} da label "${review.labelName ?? review.labelId}"?`,
      );
    }

    this.confirmOpen.set(true);
  }

  closeConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingAction.set(null);
  }

  submitDecision(reason: string): void {
    const action = this.pendingAction();
    if (!action) {
      return;
    }

    this.confirmOpen.set(false);
    this.submitting.set(true);
    this.actionMessage.set('');

    const body = {
      decision: action.decision,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    };

    this.api.submitReview(action.review.labelId, body).subscribe({
      next: () => {
        this.reviews.update((list) => list.filter((r) => r.labelId !== action.review.labelId));
        this.actionOk.set(true);
        this.actionMessage.set(
          action.decision === 'approve' ? 'Identidade aprovada.' : 'Identidade rejeitada.',
        );
        this.submitting.set(false);
        this.pendingAction.set(null);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(
          friendlyPlatformApiError(err, 'Falha ao registrar decisão de identidade.'),
        );
        this.submitting.set(false);
        this.pendingAction.set(null);
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.api.listPending().subscribe({
      next: (res) => {
        this.reviews.set(res.reviews ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          friendlyPlatformApiError(err, 'Falha ao carregar revisões de identidade.'),
        );
        this.loading.set(false);
      },
    });
  }
}
