import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  DeletionRequestStatus,
  PrivacyDeletionApiService,
  PrivacyDeletionRequestRecord,
} from '../../core/api/privacy-deletion-api.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: '', label: 'Todos' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'REJECTED', label: 'Rejeitados' },
];

const PAGE_SIZE = 50;

type PendingApprove = PrivacyDeletionRequestRecord;
type PendingReject = PrivacyDeletionRequestRecord;

@Component({
  selector: 'app-privacy-deletion-requests-page',
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, DataTableComponent, ConfirmDialogComponent],
  template: `
    <app-page-header
      title="Fila LGPD"
      description="Pedidos de exclusão de dados pessoais aguardando revisão e aprovação."
    />

    <p class="privacy-note">
      <span class="material-symbols-outlined" aria-hidden="true">privacy_tip</span>
      Dados de titulares são exibidos de forma mascarada (LGPD). A aprovação executa anonimização
      irreversível — confirme apenas após revisão do pedido.
    </p>

    <div class="filters">
      <label>
        <span>Status</span>
        <select [(ngModel)]="filterStatus" (ngModelChange)="reload()">
          @for (option of statusFilterOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </label>
    </div>

    <app-data-table
      [loading]="loading()"
      [error]="loadError()"
      [empty]="!loading() && !loadError() && !requests().length"
      loadingMessage="Carregando pedidos de exclusão…"
      emptyMessage="Nenhum pedido de exclusão encontrado."
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>Conta</th>
            <th>Usuário</th>
            <th>Data do pedido</th>
            <th>Status</th>
            <th class="th-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (request of requests(); track request.id) {
            <tr class="clickable-row" (click)="openDetail(request)">
              <td>
                @if (request.accountId) {
                  <a class="account-link" [routerLink]="['/accounts', request.accountId]">
                    {{ request.accountName ?? request.accountId }}
                  </a>
                } @else {
                  <span class="muted">{{ request.accountName ?? '—' }}</span>
                }
              </td>
              <td><code>{{ request.maskedUser ?? '—' }}</code></td>
              <td class="muted">{{ request.requestedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span
                  class="badge"
                  [class.badge--pending]="request.status === 'PENDING'"
                  [class.badge--ok]="request.status === 'APPROVED'"
                  [class.badge--off]="request.status !== 'PENDING' && request.status !== 'APPROVED'"
                >
                  {{ statusLabel(request.status) }}
                </span>
              </td>
              <td>
                @if (request.status === 'PENDING') {
                  <div class="row-actions" (click)="$event.stopPropagation()">
                    <button
                      type="button"
                      class="btn-ghost btn-sm"
                      (click)="openDetail(request)"
                    >
                      Detalhes
                    </button>
                    <button
                      type="button"
                      class="btn-ghost btn-sm"
                      [disabled]="acting()"
                      (click)="openApproveConfirm(request)"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      class="btn-ghost btn-sm btn-danger-text"
                      [disabled]="acting()"
                      (click)="openRejectConfirm(request)"
                    >
                      Rejeitar
                    </button>
                  </div>
                } @else {
                  <button type="button" class="btn-ghost btn-sm" (click)="openDetail(request); $event.stopPropagation()">
                    Detalhes
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table>

    @if (!loading() && !loadError() && hasMore()) {
      <div class="load-more">
        <button type="button" class="btn-ghost" [disabled]="loadingMore()" (click)="loadMore()">
          {{ loadingMore() ? 'Carregando…' : 'Carregar mais' }}
        </button>
      </div>
    }

    @if (actionMessage()) {
      <p class="banner" [class.banner--ok]="actionOk()" [class.banner--error]="!actionOk()">
        {{ actionMessage() }}
      </p>
    }

    <app-confirm-dialog
      [open]="approveConfirmOpen()"
      title="Aprovar exclusão de dados"
      [message]="approveConfirmMessage()"
      confirmLabel="Aprovar exclusão"
      cancelLabel="Cancelar"
      (confirmed)="confirmApprove()"
      (cancelled)="closeApproveConfirm()"
    />

    <app-confirm-dialog
      [open]="rejectConfirmOpen()"
      title="Rejeitar pedido de exclusão"
      [message]="rejectConfirmMessage()"
      confirmLabel="Rejeitar pedido"
      cancelLabel="Cancelar"
      [showReason]="true"
      reasonLabel="Motivo da rejeição (obrigatório)"
      reasonPlaceholder="Descreva o motivo para o titular e auditoria…"
      (confirmedWithReason)="confirmReject($event)"
      (cancelled)="closeRejectConfirm()"
    />

    @if (detailOpen() && detailRequest(); as req) {
      <div class="backdrop" (click)="closeDetail()" role="presentation"></div>
      <aside class="panel" role="dialog" aria-labelledby="lgpd-detail-title">
        <header class="panel__header">
          <h2 id="lgpd-detail-title">Detalhe do pedido LGPD</h2>
          <button type="button" class="panel__close" aria-label="Fechar" (click)="closeDetail()">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>
        <div class="panel__body">
          <dl class="detail-meta">
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  class="badge"
                  [class.badge--pending]="req.status === 'PENDING'"
                  [class.badge--ok]="req.status === 'APPROVED'"
                  [class.badge--off]="req.status !== 'PENDING' && req.status !== 'APPROVED'"
                >
                  {{ statusLabel(req.status) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>Titular (mascarado)</dt>
              <dd><code>{{ req.maskedUser ?? '—' }}</code></dd>
            </div>
            <div>
              <dt>Conta</dt>
              <dd>
                @if (req.accountId) {
                  <a class="account-link" [routerLink]="['/accounts', req.accountId]" (click)="closeDetail()">
                    {{ req.accountName ?? req.accountId }}
                  </a>
                } @else {
                  {{ req.accountName ?? '—' }}
                }
              </dd>
            </div>
            <div>
              <dt>Motivo do pedido</dt>
              <dd>{{ req.reason?.trim() || '—' }}</dd>
            </div>
            <div>
              <dt>Solicitado em</dt>
              <dd>{{ req.requestedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
            </div>
            @if (req.processedAt) {
              <div>
                <dt>Processado em</dt>
                <dd>{{ req.processedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
            }
            @if (req.rejectionReason) {
              <div>
                <dt>Motivo da rejeição</dt>
                <dd>{{ req.rejectionReason }}</dd>
              </div>
            }
            <div>
              <dt>ID do pedido</dt>
              <dd><code>{{ req.id }}</code></dd>
            </div>
          </dl>
        </div>
        @if (req.status === 'PENDING') {
          <footer class="panel__footer">
            <button type="button" class="btn-ghost btn-sm" [disabled]="acting()" (click)="openApproveConfirm(req); closeDetail()">
              Aprovar
            </button>
            <button type="button" class="btn-ghost btn-sm btn-danger-text" [disabled]="acting()" (click)="openRejectConfirm(req); closeDetail()">
              Rejeitar
            </button>
          </footer>
        }
      </aside>
    }
  `,
  styles: `
    .privacy-note {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: -0.75rem 0 1.25rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 200, 87, 0.08);
      border: 1px solid rgba(255, 200, 87, 0.2);
      border-radius: var(--dwa-radius-md);
      font-size: 0.8125rem;
      color: var(--dwa-warning);
      line-height: 1.45;
    }

    .privacy-note .material-symbols-outlined {
      font-size: 1.125rem;
      flex-shrink: 0;
    }

    .filters {
      margin-bottom: 1.25rem;
    }

    .filters label {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .filters select {
      width: min(200px, 100%);
      padding: 0.5rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
      font-size: 0.875rem;
      text-transform: none;
      letter-spacing: normal;
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
      width: 11rem;
    }

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .account-link {
      color: var(--dwa-gold-highlight);
      text-decoration: none;
      font-weight: 600;
    }

    .account-link:hover {
      text-decoration: underline;
    }

    .muted {
      color: var(--dwa-text-muted);
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .btn-danger-text {
      color: var(--dwa-danger);
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

    .badge--pending {
      background: rgba(255, 200, 87, 0.1);
      border: 1px solid rgba(255, 200, 87, 0.25);
      color: var(--dwa-warning);
    }

    .badge--ok {
      background: rgba(82, 224, 160, 0.1);
      border: 1px solid rgba(82, 224, 160, 0.2);
      color: var(--dwa-success);
    }

    .badge--off {
      background: rgba(163, 163, 163, 0.1);
      border: 1px solid rgba(163, 163, 163, 0.2);
      color: var(--dwa-text-muted);
    }

    .load-more {
      display: flex;
      justify-content: center;
      margin-top: 1.25rem;
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

    .clickable-row {
      cursor: pointer;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 101;
      display: flex;
      flex-direction: column;
      width: min(440px, 100vw);
      height: 100vh;
      background: var(--dwa-bg-elevated);
      border-left: 1px solid rgba(201, 162, 39, 0.2);
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
    }

    .panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #333;
    }

    .panel__header h2 {
      margin: 0;
      font-family: var(--dwa-font-display);
      font-size: 1.125rem;
    }

    .panel__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: var(--dwa-radius-md);
      background: transparent;
      color: var(--dwa-text-muted);
      cursor: pointer;
    }

    .panel__body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .detail-meta {
      display: grid;
      gap: 1rem;
      margin: 0;
    }

    .detail-meta dt {
      margin: 0 0 0.25rem;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dwa-text-muted);
    }

    .detail-meta dd {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    .panel__footer {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid #333;
    }
  `,
})
export class PrivacyDeletionRequestsPageComponent implements OnInit {
  private readonly api = inject(PrivacyDeletionApiService);

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;

  filterStatus = 'PENDING';

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly loadError = signal('');
  readonly requests = signal<PrivacyDeletionRequestRecord[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly acting = signal(false);
  readonly approveConfirmOpen = signal(false);
  readonly rejectConfirmOpen = signal(false);
  readonly pendingApprove = signal<PendingApprove | null>(null);
  readonly pendingReject = signal<PendingReject | null>(null);
  readonly actionMessage = signal('');
  readonly actionOk = signal(false);
  readonly detailOpen = signal(false);
  readonly detailRequest = signal<PrivacyDeletionRequestRecord | null>(null);

  readonly approveConfirmMessage = computed(() => {
    const request = this.pendingApprove();
    if (!request) {
      return '';
    }

    const user = request.maskedUser ?? 'titular';
    return (
      `Confirma a aprovação do pedido de exclusão de ${user}? ` +
      `Esta ação anonimiza permanentemente os dados pessoais do titular conforme a LGPD ` +
      `e não pode ser desfeita.`
    );
  });

  readonly rejectConfirmMessage = computed(() => {
    const request = this.pendingReject();
    if (!request) {
      return '';
    }

    const user = request.maskedUser ?? 'titular';
    return `Rejeitar o pedido de exclusão de ${user}? Informe o motivo abaixo.`;
  });

  ngOnInit(): void {
    this.reload();
  }

  hasMore(): boolean {
    return this.requests().length < this.total();
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  openDetail(request: PrivacyDeletionRequestRecord): void {
    this.detailRequest.set(request);
    this.detailOpen.set(true);
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.detailRequest.set(null);
  }

  openApproveConfirm(request: PrivacyDeletionRequestRecord): void {
    this.pendingApprove.set(request);
    this.actionMessage.set('');
    this.approveConfirmOpen.set(true);
  }

  closeApproveConfirm(): void {
    this.approveConfirmOpen.set(false);
    this.pendingApprove.set(null);
  }

  openRejectConfirm(request: PrivacyDeletionRequestRecord): void {
    this.pendingReject.set(request);
    this.actionMessage.set('');
    this.rejectConfirmOpen.set(true);
  }

  closeRejectConfirm(): void {
    this.rejectConfirmOpen.set(false);
    this.pendingReject.set(null);
  }

  confirmApprove(): void {
    const request = this.pendingApprove();
    if (!request) {
      return;
    }

    this.approveConfirmOpen.set(false);
    this.acting.set(true);
    this.actionMessage.set('');

    this.api.approve(request.id).subscribe({
      next: () => {
        this.updateRequestStatus(request.id, 'APPROVED');
        this.actionOk.set(true);
        this.actionMessage.set('Pedido de exclusão aprovado. Dados anonimizados.');
        this.acting.set(false);
        this.pendingApprove.set(null);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(
          friendlyPlatformApiError(err, 'Falha ao aprovar pedido de exclusão.'),
        );
        this.acting.set(false);
        this.pendingApprove.set(null);
      },
    });
  }

  confirmReject(reason: string): void {
    const request = this.pendingReject();
    if (!request) {
      return;
    }

    if (!reason.trim()) {
      this.rejectConfirmOpen.set(false);
      this.actionOk.set(false);
      this.actionMessage.set('Informe o motivo da rejeição.');
      this.pendingReject.set(null);
      return;
    }

    this.rejectConfirmOpen.set(false);
    this.acting.set(true);
    this.actionMessage.set('');

    this.api.reject(request.id, reason.trim()).subscribe({
      next: () => {
        this.updateRequestStatus(request.id, 'REJECTED');
        this.actionOk.set(true);
        this.actionMessage.set('Pedido de exclusão rejeitado.');
        this.acting.set(false);
        this.pendingReject.set(null);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(
          friendlyPlatformApiError(err, 'Falha ao rejeitar pedido de exclusão.'),
        );
        this.acting.set(false);
        this.pendingReject.set(null);
      },
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadingMore.set(true);

    this.api
      .list({
        status: (this.filterStatus as DeletionRequestStatus) || undefined,
        limit: PAGE_SIZE,
        offset: this.offset(),
      })
      .subscribe({
        next: (res) => {
          this.requests.update((current) => [...current, ...(res.requests ?? [])]);
          this.total.set(res.total ?? this.requests().length);
          this.offset.set(this.requests().length);
          this.loadingMore.set(false);
        },
        error: (err) => {
          this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar mais pedidos.'));
          this.loadingMore.set(false);
        },
      });
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.offset.set(0);

    this.api
      .list({
        status: (this.filterStatus as DeletionRequestStatus) || undefined,
        limit: PAGE_SIZE,
        offset: 0,
      })
      .subscribe({
        next: (res) => {
          this.requests.set(res.requests ?? []);
          this.total.set(res.total ?? res.requests?.length ?? 0);
          this.offset.set(res.requests?.length ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(
            friendlyPlatformApiError(err, 'Falha ao carregar pedidos de exclusão.'),
          );
          this.loading.set(false);
        },
      });
  }

  private updateRequestStatus(id: string, status: DeletionRequestStatus): void {
    if (this.filterStatus === 'PENDING') {
      this.requests.update((list) => list.filter((item) => item.id !== id));
      this.total.update((t) => Math.max(0, t - 1));
      return;
    }

    this.requests.update((list) =>
      list.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }
}
