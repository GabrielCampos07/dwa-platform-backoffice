import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  DeveloperAnnouncementRecord,
  DeveloperAnnouncementStatus,
  DeveloperAnnouncementsApiService,
} from '../../core/api/developer-announcements-api.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type PendingAction = {
  announcement: DeveloperAnnouncementRecord;
  action: 'publish' | 'end' | 'delete';
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'LIVE', label: 'Ativo' },
  { value: 'ENDED', label: 'Encerrado' },
];

const PAGE_SIZE = 50;

@Component({
  selector: 'app-developer-announcements-list-page',
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, DataTableComponent, ConfirmDialogComponent],
  template: `
    <app-page-header
      title="Avisos de desenvolvedor"
      description="Comunicados globais exibidos no app para todos os usuários."
    >
      <a actions routerLink="/developer-announcements/new" class="create-btn">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        <span>Novo aviso</span>
      </a>
    </app-page-header>

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
      [empty]="!loading() && !loadError() && !announcements().length"
      loadingMessage="Carregando avisos…"
      emptyMessage="Nenhum aviso de desenvolvedor cadastrado."
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Severidade</th>
            <th>Status</th>
            <th>Publicado em</th>
            <th class="th-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (item of announcements(); track item.id) {
            <tr>
              <td>
                <span class="name">{{ item.title }}</span>
                <span class="muted preview">{{ item.body }}</span>
              </td>
              <td>{{ severityLabel(item.severity) }}</td>
              <td>
                <span class="badge" [class]="statusBadgeClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td class="muted">
                @if (item.publishedAt) {
                  {{ item.publishedAt | date: 'dd/MM/yyyy HH:mm' }}
                } @else {
                  —
                }
              </td>
              <td>
                <div class="row-actions">
                  @if (item.status === 'DRAFT') {
                    <a
                      class="row-action"
                      [routerLink]="['/developer-announcements', item.id]"
                      [attr.aria-label]="'Editar ' + item.title"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                    </a>
                  } @else {
                    <a
                      class="row-action row-action--text"
                      [routerLink]="['/developer-announcements', item.id]"
                    >
                      Visualizar
                    </a>
                  }
                  @if (item.status === 'DRAFT') {
                    <button
                      type="button"
                      class="btn-ghost btn-sm"
                      [disabled]="acting()"
                      (click)="openConfirm(item, 'publish')"
                    >
                      Publicar
                    </button>
                    <button
                      type="button"
                      class="btn-ghost btn-sm btn-danger-text"
                      [disabled]="acting()"
                      (click)="openConfirm(item, 'delete')"
                    >
                      Excluir
                    </button>
                  }
                  @if (item.status === 'LIVE') {
                    <button
                      type="button"
                      class="btn-ghost btn-sm"
                      [disabled]="acting()"
                      (click)="openConfirm(item, 'end')"
                    >
                      Encerrar
                    </button>
                  }
                </div>
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
      [open]="confirmOpen()"
      [title]="confirmTitle()"
      [message]="confirmMessage()"
      [confirmLabel]="confirmButtonLabel()"
      cancelLabel="Cancelar"
      (confirmed)="submitAction()"
      (cancelled)="closeConfirm()"
    />
  `,
  styles: `
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

    .load-more {
      display: flex;
      justify-content: center;
      margin-top: 1.25rem;
    }

    .btn-danger-text {
      color: var(--dwa-danger);
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
      white-space: nowrap;
    }

    .create-btn:hover {
      background: var(--dwa-gold-highlight);
    }

    .create-btn .material-symbols-outlined {
      font-size: 1.125rem;
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

    .preview {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 360px;
    }

    .muted {
      display: block;
      color: var(--dwa-text-muted);
      font-size: 0.75rem;
      margin-top: 0.125rem;
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

    .badge--draft {
      background: rgba(163, 163, 163, 0.1);
      border: 1px solid rgba(163, 163, 163, 0.2);
      color: var(--dwa-text-muted);
    }

    .badge--live {
      background: rgba(82, 224, 160, 0.1);
      border: 1px solid rgba(82, 224, 160, 0.2);
      color: var(--dwa-success);
    }

    .badge--ended {
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.2);
      color: var(--dwa-danger);
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
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
    }

    .row-action:hover {
      color: var(--dwa-gold-highlight);
      border-color: rgba(201, 162, 39, 0.4);
    }

    .row-action .material-symbols-outlined {
      font-size: 1rem;
    }

    .row-action--text {
      width: auto;
      height: auto;
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
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
  `,
})
export class DeveloperAnnouncementsListPageComponent implements OnInit {
  private readonly api = inject(DeveloperAnnouncementsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(RealtimeService);

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;

  filterStatus = '';

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly loadError = signal('');
  readonly announcements = signal<DeveloperAnnouncementRecord[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly acting = signal(false);
  readonly confirmOpen = signal(false);
  readonly pendingAction = signal<PendingAction | null>(null);
  readonly actionMessage = signal('');
  readonly actionOk = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmMessage = signal('');

  ngOnInit(): void {
    this.reload();

    this.realtime.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.type === 'announcement_published') {
        this.reload();
      }
    });
  }

  hasMore(): boolean {
    return this.announcements().length < this.total();
  }

  confirmButtonLabel(): string {
    const action = this.pendingAction()?.action;
    if (action === 'end') return 'Encerrar';
    if (action === 'delete') return 'Excluir';
    return 'Publicar';
  }

  severityLabel(severity: string): string {
    switch (severity) {
      case 'INFO':
        return 'Informação';
      case 'WARNING':
        return 'Aviso';
      case 'CRITICAL':
        return 'Crítico';
      default:
        return severity;
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Rascunho';
      case 'LIVE':
        return 'Ativo';
      case 'ENDED':
        return 'Encerrado';
      default:
        return status;
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'badge--draft';
      case 'LIVE':
        return 'badge--live';
      case 'ENDED':
        return 'badge--ended';
      default:
        return 'badge--draft';
    }
  }

  openConfirm(announcement: DeveloperAnnouncementRecord, action: PendingAction['action']): void {
    this.pendingAction.set({ announcement, action });
    this.actionMessage.set('');

    if (action === 'publish') {
      this.confirmTitle.set('Publicar aviso');
      this.confirmMessage.set(`Publicar o aviso "${announcement.title}"? Ele ficará visível para todos os usuários.`);
    } else if (action === 'delete') {
      this.confirmTitle.set('Excluir rascunho');
      this.confirmMessage.set(`Excluir o rascunho "${announcement.title}"? Esta ação não pode ser desfeita.`);
    } else {
      this.confirmTitle.set('Encerrar aviso');
      this.confirmMessage.set(`Encerrar o aviso "${announcement.title}"? Ele deixará de ser exibido.`);
    }

    this.confirmOpen.set(true);
  }

  closeConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingAction.set(null);
  }

  submitAction(): void {
    const pending = this.pendingAction();
    if (!pending) {
      return;
    }

    this.confirmOpen.set(false);
    this.acting.set(true);
    this.actionMessage.set('');

    if (pending.action === 'delete') {
      this.api.delete(pending.announcement.id).subscribe({
        next: () => {
          this.announcements.update((list) =>
            list.filter((item) => item.id !== pending.announcement.id),
          );
          this.total.update((t) => Math.max(0, t - 1));
          this.actionOk.set(true);
          this.actionMessage.set('Rascunho excluído.');
          this.acting.set(false);
          this.pendingAction.set(null);
        },
        error: (err) => {
          this.actionOk.set(false);
          this.actionMessage.set(
            friendlyPlatformApiError(err, 'Falha ao atualizar status do aviso.'),
          );
          this.acting.set(false);
          this.pendingAction.set(null);
        },
      });
      return;
    }

    const request =
      pending.action === 'publish'
        ? this.api.publish(pending.announcement.id)
        : this.api.end(pending.announcement.id);

    request.subscribe({
      next: (res) => {
        this.announcements.update((list) =>
          list.map((item) => (item.id === res.announcement.id ? res.announcement : item)),
        );
        this.actionOk.set(true);
        this.actionMessage.set(
          pending.action === 'publish' ? 'Aviso publicado.' : 'Aviso encerrado.',
        );
        this.acting.set(false);
        this.pendingAction.set(null);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(
          friendlyPlatformApiError(err, 'Falha ao atualizar status do aviso.'),
        );
        this.acting.set(false);
        this.pendingAction.set(null);
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
        status: (this.filterStatus as DeveloperAnnouncementStatus) || undefined,
        limit: PAGE_SIZE,
        offset: this.offset(),
      })
      .subscribe({
        next: (res) => {
          this.announcements.update((current) => [...current, ...(res.announcements ?? [])]);
          this.total.set(res.total ?? this.announcements().length);
          this.offset.set(this.announcements().length);
          this.loadingMore.set(false);
        },
        error: (err) => {
          this.loadError.set(
            friendlyPlatformApiError(err, 'Falha ao carregar mais avisos.'),
          );
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
        status: (this.filterStatus as DeveloperAnnouncementStatus) || undefined,
        limit: PAGE_SIZE,
        offset: 0,
      })
      .subscribe({
        next: (res) => {
          this.announcements.set(res.announcements ?? []);
          this.total.set(res.total ?? res.announcements?.length ?? 0);
          this.offset.set(res.announcements?.length ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(
            friendlyPlatformApiError(err, 'Falha ao carregar avisos de desenvolvedor.'),
          );
          this.loading.set(false);
        },
      });
  }
}
