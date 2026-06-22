import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  AuditLogsApiService,
  PlatformAuditLogRecord,
} from '../../core/api/audit-logs-api.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const PAGE_SIZE = 50;

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'Todos os recursos' },
  { value: 'account', label: 'Conta' },
  { value: 'user', label: 'Usuário' },
  { value: 'label', label: 'Label' },
  { value: 'feed_post', label: 'Publicação do feed' },
  { value: 'campus_notice', label: 'Aviso do campus' },
  { value: 'developer_announcement', label: 'Aviso de desenvolvedor' },
  { value: 'deletion_request', label: 'Pedido LGPD' },
  { value: 'identity_review', label: 'Revisão de identidade' },
  { value: 'feature_flags', label: 'Feature flags' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Todas as ações' },
  { value: 'account.updated', label: 'Conta atualizada' },
  { value: 'user.activated', label: 'Usuário ativado' },
  { value: 'user.suspended', label: 'Usuário suspenso' },
  { value: 'identity_review.approve', label: 'Identidade aprovada' },
  { value: 'identity_review.reject', label: 'Identidade rejeitada' },
  { value: 'campus_notice.created', label: 'Aviso campus criado' },
  { value: 'campus_notice.updated', label: 'Aviso campus atualizado' },
  { value: 'campus_notice.published', label: 'Aviso campus publicado' },
  { value: 'campus_notice.ended', label: 'Aviso campus encerrado' },
  { value: 'campus_notice.cancelled', label: 'Aviso campus cancelado' },
  { value: 'developer_announcement.created', label: 'Aviso dev criado' },
  { value: 'developer_announcement.updated', label: 'Aviso dev atualizado' },
  { value: 'developer_announcement.published', label: 'Aviso dev publicado' },
  { value: 'developer_announcement.ended', label: 'Aviso dev encerrado' },
  { value: 'developer_announcement.deleted', label: 'Aviso dev excluído' },
  { value: 'feed_post.deleted', label: 'Post removido' },
  { value: 'deletion_request.approved', label: 'LGPD aprovado' },
  { value: 'deletion_request.rejected', label: 'LGPD rejeitado' },
  { value: 'feature_flags.updated', label: 'Flags atualizadas' },
];

@Component({
  selector: 'app-audit-logs-page',
  imports: [DatePipe, FormsModule, PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header
      title="Auditoria"
      description="Registro de ações de operadores na plataforma."
    />

    <div class="filters">
      <label>
        <span>Tipo de recurso</span>
        <select [(ngModel)]="filterResourceType" (ngModelChange)="applyFilters()">
          @for (option of resourceTypeOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </label>
      <label>
        <span>Ação</span>
        <select [(ngModel)]="filterAction" (ngModelChange)="applyFilters()">
          @for (option of actionOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </label>
      <label>
        <span>Operador</span>
        <input
          type="text"
          [(ngModel)]="filterOperatorId"
          (ngModelChange)="applyFilters()"
          placeholder="ID do operador"
        />
      </label>
      <label>
        <span>De</span>
        <input type="date" [(ngModel)]="filterFromDate" (ngModelChange)="applyFilters()" />
      </label>
      <label>
        <span>Até</span>
        <input type="date" [(ngModel)]="filterToDate" (ngModelChange)="applyFilters()" />
      </label>
    </div>

    <app-data-table
      [loading]="loading()"
      [error]="loadError()"
      [empty]="!loading() && !loadError() && !logs().length"
      loadingMessage="Carregando registros de auditoria…"
      emptyMessage="Nenhum registro de auditoria encontrado."
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>Data/hora</th>
            <th>Origem</th>
            <th>Operador</th>
            <th>Ação</th>
            <th>Recurso</th>
            <th>Metadados</th>
          </tr>
        </thead>
        <tbody>
          @for (log of logs(); track log.id) {
            <tr>
              <td class="muted">{{ log.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
              <td>
                <span class="source-badge" [class]="sourceBadgeClass(log)">
                  {{ sourceLabel(log) }}
                </span>
              </td>
              <td><code>{{ log.operatorId || '—' }}</code></td>
              <td>{{ log.action }}</td>
              <td>
                <span class="resource-type">{{ log.resourceType }}</span>
                @if (log.resourceId) {
                  <code class="resource-id">{{ log.resourceId }}</code>
                }
              </td>
              <td>
                @if (log.metadata && metadataKeys(log.metadata).length) {
                  <span class="metadata-preview" [title]="metadataPreview(log.metadata)">
                    {{ metadataPreview(log.metadata) }}
                  </span>
                } @else {
                  <span class="muted">—</span>
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
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
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

    .filters select,
    .filters input {
      min-width: 160px;
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

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .muted {
      color: var(--dwa-text-muted);
      font-size: 0.8125rem;
    }

    .source-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .source-badge--platform {
      background: rgba(96, 165, 250, 0.1);
      border: 1px solid rgba(96, 165, 250, 0.25);
      color: #93c5fd;
    }

    .source-badge--product {
      background: rgba(201, 162, 39, 0.1);
      border: 1px solid rgba(201, 162, 39, 0.25);
      color: var(--dwa-gold-highlight);
    }

    .resource-type {
      display: block;
      font-weight: 600;
      color: var(--dwa-text-primary);
    }

    .resource-id {
      display: block;
      margin-top: 0.125rem;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
    }

    .metadata-preview {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 280px;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
      font-family: ui-monospace, monospace;
    }

    .load-more {
      display: flex;
      justify-content: center;
      margin-top: 1.25rem;
    }
  `,
})
export class AuditLogsPageComponent implements OnInit {
  private readonly api = inject(AuditLogsApiService);
  private readonly auth = inject(AuthService);

  readonly resourceTypeOptions = RESOURCE_TYPE_OPTIONS;
  readonly actionOptions = ACTION_OPTIONS;

  filterResourceType = '';
  filterAction = '';
  filterOperatorId = '';
  filterFromDate = '';
  filterToDate = '';

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly loadError = signal('');
  readonly logs = signal<PlatformAuditLogRecord[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);

  readonly hasMore = computed(() => this.logs().length < this.total());

  ngOnInit(): void {
    this.filterOperatorId = this.auth.getOperatorId();
    this.reload();
  }

  applyFilters(): void {
    this.reload();
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadingMore.set(true);

    this.api.list(this.buildFilters(this.offset())).subscribe({
      next: (res) => {
        this.logs.update((current) => [...current, ...(res.logs ?? [])]);
        this.total.set(res.total ?? this.logs().length);
        this.offset.set(this.logs().length);
        this.loadingMore.set(false);
      },
      error: (err) => {
        this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar mais registros.'));
        this.loadingMore.set(false);
      },
    });
  }

  metadataKeys(metadata: Record<string, unknown>): string[] {
    return Object.keys(metadata);
  }

  metadataPreview(metadata: Record<string, unknown> | null | undefined): string {
    if (!metadata || !Object.keys(metadata).length) {
      return '';
    }

    try {
      const raw = JSON.stringify(metadata);
      return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
    } catch {
      return '—';
    }
  }

  sourceLabel(log: PlatformAuditLogRecord): string {
    return resolveAuditLogSource(log) === 'product' ? 'Produto' : 'Plataforma';
  }

  sourceBadgeClass(log: PlatformAuditLogRecord): string {
    return resolveAuditLogSource(log) === 'product'
      ? 'source-badge--product'
      : 'source-badge--platform';
  }

  private buildFilters(offset: number) {
    return {
      resourceType: this.filterResourceType || undefined,
      action: this.filterAction || undefined,
      operatorId: this.filterOperatorId.trim() || undefined,
      fromDate: this.filterFromDate ? toIsoStart(this.filterFromDate) : undefined,
      toDate: this.filterToDate ? toIsoEnd(this.filterToDate) : undefined,
      limit: PAGE_SIZE,
      offset,
    };
  }

  private reload(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.offset.set(0);

    this.api.list(this.buildFilters(0)).subscribe({
      next: (res) => {
        this.logs.set(res.logs ?? []);
        this.total.set(res.total ?? res.logs?.length ?? 0);
        this.offset.set(res.logs?.length ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          friendlyPlatformApiError(err, 'Falha ao carregar registros de auditoria.'),
        );
        this.loading.set(false);
      },
    });
  }
}

function toIsoStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toIsoEnd(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

const PRODUCT_ACTION_PREFIXES = ['product.', 'tenant.', 'check_in.', 'workout.', 'subscription.'];

function resolveAuditLogSource(log: PlatformAuditLogRecord): 'platform' | 'product' {
  const explicit = log.source?.toLowerCase();
  if (explicit === 'product' || explicit === 'produto') {
    return 'product';
  }
  if (explicit === 'platform' || explicit === 'plataforma') {
    return 'platform';
  }

  const meta = log.metadata;
  if (meta) {
    const metaSource = meta['source'];
    if (typeof metaSource === 'string') {
      const normalized = metaSource.toLowerCase();
      if (normalized === 'product' || normalized === 'produto') {
        return 'product';
      }
      if (normalized === 'platform' || normalized === 'plataforma') {
        return 'platform';
      }
    }
    if (meta['productId'] && !meta['operatorScope']) {
      return 'product';
    }
  }

  const action = log.action.toLowerCase();
  if (PRODUCT_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix))) {
    return 'product';
  }

  return 'platform';
}
