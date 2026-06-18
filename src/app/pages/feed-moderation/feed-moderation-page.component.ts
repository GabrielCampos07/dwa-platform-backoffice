import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import { FeedModerationApiService, FeedModerationActionRecord, FeedPostRecord } from '../../core/api/feed-moderation-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { FeedPostDetailPanelComponent } from '../../shared/components/feed-post-detail-panel/feed-post-detail-panel.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-feed-moderation-page',
  imports: [
    DatePipe,
    PageHeaderComponent,
    DataTableComponent,
    ConfirmDialogComponent,
    FeedPostDetailPanelComponent,
  ],
  template: `
    <app-page-header
      title="Moderação do feed"
      description="Remova publicações que violem as políticas da plataforma."
    />

    <div class="scope-bar">
      @if (context.hasValidLabelScope() && !showAll()) {
        <div class="scope-chip">
          <span class="material-symbols-outlined" aria-hidden="true">corporate_fare</span>
          <span>
            Escopo: <strong>{{ context.labelName() }}</strong>
            <code>{{ context.labelSlug() }}</code>
          </span>
        </div>
      } @else {
        <span class="scope-chip scope-chip--all">Exibindo publicações de todas as contas</span>
      }
      @if (context.hasValidLabelScope()) {
        <label class="scope-toggle">
          <input type="checkbox" [checked]="showAll()" (change)="toggleShowAll($event)" />
          <span>Ver todos</span>
        </label>
      }
    </div>

    <p class="privacy-note">
      Dados pessoais são mascarados conforme a LGPD. Use o motivo da remoção apenas para fins de
      auditoria interna.
    </p>

    <div class="tabs" role="tablist">
      <button
        type="button"
        class="tab"
        [class.tab--active]="activeTab() === 'posts'"
        role="tab"
        [attr.aria-selected]="activeTab() === 'posts'"
        (click)="switchTab('posts')"
      >
        Publicações
      </button>
      <button
        type="button"
        class="tab"
        [class.tab--active]="activeTab() === 'history'"
        role="tab"
        [attr.aria-selected]="activeTab() === 'history'"
        (click)="switchTab('history')"
      >
        Histórico de moderação
      </button>
    </div>

    @if (activeTab() === 'posts') {
    <app-data-table
      [loading]="loading()"
      [error]="loadError()"
      [empty]="!loading() && !loadError() && !posts().length"
      loadingMessage="Carregando publicações…"
      emptyMessage="Nenhuma publicação encontrada no feed."
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>Autor</th>
            <th>Conteúdo</th>
            <th>Label / Conta</th>
            <th>Tipo</th>
            <th>Publicado em</th>
            <th class="th-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (post of posts(); track post.id) {
            <tr>
              <td>{{ post.authorMasked }}</td>
              <td>
                <span class="preview">{{ post.contentPreview }}</span>
              </td>
              <td class="muted">{{ post.labelName ?? post.accountName ?? '—' }}</td>
              <td><code>{{ post.type }}</code></td>
              <td class="muted">{{ post.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <div class="row-actions">
                  <button type="button" class="btn-ghost btn-sm" (click)="openDetail(post)">
                    Ver post
                  </button>
                  <button
                    type="button"
                    class="btn-danger btn-sm"
                    [disabled]="deleting()"
                    (click)="openDeleteConfirm(post)"
                  >
                    Remover
                  </button>
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
    } @else {
      <app-data-table
        [loading]="historyLoading()"
        [error]="historyError()"
        [empty]="!historyLoading() && !historyError() && !historyActions().length"
        loadingMessage="Carregando histórico…"
        emptyMessage="Nenhuma ação de moderação registrada."
      >
        <table class="data-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Label / Conta</th>
              <th>Motivo</th>
              <th>Operador</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            @for (action of historyActions(); track action.id) {
              <tr>
                <td><code>{{ action.postId }}</code></td>
                <td class="muted">{{ action.labelName ?? action.labelId ?? '—' }}</td>
                <td>{{ action.reason }}</td>
                <td><code>{{ action.operatorId }}</code></td>
                <td class="muted">{{ action.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </app-data-table>

      @if (!historyLoading() && !historyError() && historyHasMore()) {
        <div class="load-more">
          <button
            type="button"
            class="btn-ghost"
            [disabled]="historyLoadingMore()"
            (click)="loadMoreHistory()"
          >
            {{ historyLoadingMore() ? 'Carregando…' : 'Carregar mais' }}
          </button>
        </div>
      }
    }

    @if (actionMessage()) {
      <p class="banner" [class.banner--ok]="actionOk()" [class.banner--error]="!actionOk()">
        {{ actionMessage() }}
      </p>
    }

    <app-feed-post-detail-panel
      [open]="detailOpen()"
      [post]="detailPost()"
      (close)="closeDetail()"
      (remove)="removeFromDetail()"
    />

    <app-confirm-dialog
      [open]="confirmOpen()"
      title="Remover publicação"
      [message]="confirmMessage()"
      confirmLabel="Remover"
      cancelLabel="Cancelar"
      [showReason]="true"
      reasonLabel="Motivo da remoção (obrigatório)"
      reasonPlaceholder="Descreva o motivo da remoção para auditoria…"
      (confirmedWithReason)="submitDelete($event)"
      (cancelled)="closeConfirm()"
    />
  `,
  styles: `
    .scope-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .scope-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: rgba(201, 162, 39, 0.08);
      border: 1px solid rgba(201, 162, 39, 0.22);
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      color: var(--dwa-text-muted);
    }

    .scope-chip--all {
      background: rgba(163, 163, 163, 0.08);
      border-color: rgba(163, 163, 163, 0.2);
    }

    .scope-chip strong {
      color: var(--dwa-text-primary);
    }

    .scope-chip code {
      margin-left: 0.5rem;
    }

    .scope-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--dwa-text-muted);
      cursor: pointer;
    }

    .privacy-note {
      margin: 0 0 1.25rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 200, 87, 0.08);
      border: 1px solid rgba(255, 200, 87, 0.2);
      border-radius: var(--dwa-radius-md);
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--dwa-text-muted);
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid #333;
    }

    .tab {
      padding: 0.625rem 1rem;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--dwa-text-muted);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: -1px;
    }

    .tab--active {
      color: var(--dwa-gold-highlight);
      border-bottom-color: var(--dwa-gold-primary);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .data-table th,
    .data-table td {
      padding: 1rem 1.25rem;
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
      min-width: 180px;
    }

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .preview {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 360px;
      line-height: 1.5;
      color: var(--dwa-text-primary);
    }

    .muted {
      color: var(--dwa-text-muted);
      font-size: 0.8125rem;
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-wrap: wrap;
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
  `,
})
export class FeedModerationPageComponent implements OnInit {
  private readonly api = inject(FeedModerationApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(RealtimeService);
  readonly context = inject(PlatformContextService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly loadError = signal('');
  readonly posts = signal<FeedPostRecord[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly showAll = signal(false);
  readonly deleting = signal(false);
  readonly confirmOpen = signal(false);
  readonly detailOpen = signal(false);
  readonly detailPost = signal<FeedPostRecord | null>(null);
  readonly pendingPost = signal<FeedPostRecord | null>(null);
  readonly actionMessage = signal('');
  readonly actionOk = signal(false);
  readonly confirmMessage = signal('');

  readonly activeTab = signal<'posts' | 'history'>('posts');
  readonly historyLoading = signal(false);
  readonly historyLoadingMore = signal(false);
  readonly historyError = signal('');
  readonly historyActions = signal<FeedModerationActionRecord[]>([]);
  readonly historyTotal = signal(0);
  readonly historyOffset = signal(0);

  readonly hasMore = computed(() => this.posts().length < this.total());
  readonly historyHasMore = computed(() => this.historyActions().length < this.historyTotal());

  ngOnInit(): void {
    const labelId = this.route.snapshot.queryParamMap.get('labelId')?.trim();
    if (labelId && !this.context.hasValidLabelScope()) {
      // Deep-link from account detail — scope may not be set; filter directly via query.
      this.showAll.set(false);
    }
    if (this.route.snapshot.queryParamMap.get('all') === '1') {
      this.showAll.set(true);
    }
    this.reload();

    this.context.scopeChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.showAll()) {
        this.reload();
      }
    });

    this.realtime.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.type === 'feed_post_deleted') {
        if (this.activeTab() === 'posts') {
          this.reload();
        } else {
          this.reloadHistory();
        }
      }
    });
  }

  switchTab(tab: 'posts' | 'history'): void {
    this.activeTab.set(tab);
    if (tab === 'history' && !this.historyActions().length && !this.historyLoading()) {
      this.reloadHistory();
    }
  }

  toggleShowAll(event: Event): void {
    this.showAll.set((event.target as HTMLInputElement).checked);
    this.reload();
  }

  openDetail(post: FeedPostRecord): void {
    this.detailPost.set(post);
    this.detailOpen.set(true);
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.detailPost.set(null);
  }

  removeFromDetail(): void {
    const post = this.detailPost();
    if (post) {
      this.closeDetail();
      this.openDeleteConfirm(post);
    }
  }

  openDeleteConfirm(post: FeedPostRecord): void {
    this.pendingPost.set(post);
    this.actionMessage.set('');
    this.confirmMessage.set(
      `Remover a publicação de ${post.authorMasked}? Esta ação não pode ser desfeita.`,
    );
    this.confirmOpen.set(true);
  }

  closeConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingPost.set(null);
  }

  submitDelete(reason: string): void {
    const post = this.pendingPost();
    if (!post) {
      return;
    }

    if (!reason.trim()) {
      this.confirmOpen.set(false);
      this.actionOk.set(false);
      this.actionMessage.set('Informe o motivo da remoção.');
      this.pendingPost.set(null);
      return;
    }

    this.confirmOpen.set(false);
    this.deleting.set(true);
    this.actionMessage.set('');

    this.api.delete(post.id, reason.trim()).subscribe({
      next: () => {
        this.posts.update((list) => list.filter((p) => p.id !== post.id));
        this.total.update((t) => Math.max(0, t - 1));
        this.actionOk.set(true);
        this.actionMessage.set('Publicação removida.');
        this.deleting.set(false);
        this.pendingPost.set(null);
        if (this.activeTab() === 'history') {
          this.reloadHistory();
        }
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(friendlyPlatformApiError(err, 'Falha ao remover publicação.'));
        this.deleting.set(false);
        this.pendingPost.set(null);
      },
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadingMore.set(true);

    this.api.list(this.buildFilters(this.offset())).subscribe({
      next: (res) => {
        this.posts.update((current) => [...current, ...(res.posts ?? [])]);
        this.total.set(res.total ?? this.posts().length);
        this.offset.set(this.posts().length);
        this.loadingMore.set(false);
      },
      error: (err) => {
        this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar mais publicações.'));
        this.loadingMore.set(false);
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.offset.set(0);

    this.api.list(this.buildFilters(0)).subscribe({
      next: (res) => {
        this.posts.set(res.posts ?? []);
        this.total.set(res.total ?? res.posts?.length ?? 0);
        this.offset.set(res.posts?.length ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar publicações do feed.'));
        this.loading.set(false);
      },
    });
  }

  private buildFilters(offset: number) {
    const queryLabelId = this.route.snapshot.queryParamMap.get('labelId')?.trim();
    const labelId =
      !this.showAll() && (this.context.labelId().trim() || queryLabelId)
        ? this.context.labelId().trim() || queryLabelId
        : undefined;

    return {
      labelId,
      limit: PAGE_SIZE,
      offset,
    };
  }

  loadMoreHistory(): void {
    if (this.historyLoadingMore() || !this.historyHasMore()) {
      return;
    }

    this.historyLoadingMore.set(true);

    this.api.listModerationActions(this.buildHistoryFilters(this.historyOffset())).subscribe({
      next: (res) => {
        this.historyActions.update((current) => [...current, ...(res.actions ?? [])]);
        this.historyTotal.set(res.total ?? this.historyActions().length);
        this.historyOffset.set(this.historyActions().length);
        this.historyLoadingMore.set(false);
      },
      error: (err) => {
        this.historyError.set(friendlyPlatformApiError(err, 'Falha ao carregar mais histórico.'));
        this.historyLoadingMore.set(false);
      },
    });
  }

  private reloadHistory(): void {
    this.historyLoading.set(true);
    this.historyError.set('');
    this.historyOffset.set(0);

    this.api.listModerationActions(this.buildHistoryFilters(0)).subscribe({
      next: (res) => {
        this.historyActions.set(res.actions ?? []);
        this.historyTotal.set(res.total ?? res.actions?.length ?? 0);
        this.historyOffset.set(res.actions?.length ?? 0);
        this.historyLoading.set(false);
      },
      error: (err) => {
        this.historyError.set(
          friendlyPlatformApiError(err, 'Falha ao carregar histórico de moderação.'),
        );
        this.historyLoading.set(false);
      },
    });
  }

  private buildHistoryFilters(offset: number) {
    const queryLabelId = this.route.snapshot.queryParamMap.get('labelId')?.trim();
    const labelId =
      !this.showAll() && (this.context.labelId().trim() || queryLabelId)
        ? this.context.labelId().trim() || queryLabelId
        : undefined;

    return { labelId, limit: PAGE_SIZE, offset };
  }
}
