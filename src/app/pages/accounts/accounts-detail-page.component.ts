import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  AccountRecord,
  AccountsApiService,
  SerimpetoMetadata,
} from '../../core/api/accounts-api.service';
import {
  AccountDashboardStats,
  AnalyticsApiService,
} from '../../core/api/analytics-api.service';
import { AccountUserRecord, UsersApiService } from '../../core/api/users-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type AccountTab = 'overview' | 'users' | 'stats' | 'feed';

type PendingUserAction = {
  user: AccountUserRecord;
  activate: boolean;
};

const USERS_PAGE_SIZE = 50;

const USER_ROLE_OPTIONS = [
  { value: '', label: 'Todos os papéis' },
  { value: 'admin', label: 'Admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'student', label: 'Aluno' },
];

@Component({
  selector: 'app-accounts-detail-page',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    ConfirmDialogComponent,
    DataTableComponent,
  ],
  template: `
    <app-page-header [title]="account()?.name ?? 'Conta'" description="Detalhes da conta na plataforma.">
      <a actions routerLink="/accounts" class="back-link">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        <span>Voltar à lista</span>
      </a>
    </app-page-header>

    @if (loadError()) {
      <p class="banner banner--error">{{ loadError() }}</p>
    } @else if (loading()) {
      <p class="muted">Carregando conta…</p>
    } @else if (account(); as acc) {
      <nav class="tabs" aria-label="Seções da conta">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            class="tab"
            [class.tab--active]="activeTab() === tab.id"
            [disabled]="tab.disabled"
            [attr.aria-disabled]="tab.disabled"
            [attr.aria-current]="activeTab() === tab.id ? 'page' : null"
            (click)="selectTab(tab.id)"
          >
            {{ tab.label }}
            @if (tab.disabled) {
              <span class="tab__soon">em breve</span>
            }
          </button>
        }
      </nav>

      @if (activeTab() === 'overview') {
        <div class="detail-grid">
          <section class="card">
            <h2>Informações gerais</h2>
            <dl class="meta">
              <div class="name-edit">
                <dt>Nome</dt>
                <dd>
                  @if (editingName()) {
                    <div class="name-edit__form">
                      <input
                        type="text"
                        [(ngModel)]="editNameValue"
                        maxlength="160"
                        [disabled]="savingName()"
                      />
                      <button
                        type="button"
                        class="btn-primary btn-sm"
                        [disabled]="savingName() || !editNameValue.trim()"
                        (click)="saveName()"
                      >
                        {{ savingName() ? 'Salvando…' : 'Salvar' }}
                      </button>
                      <button
                        type="button"
                        class="btn-ghost btn-sm"
                        [disabled]="savingName()"
                        (click)="cancelNameEdit()"
                      >
                        Cancelar
                      </button>
                    </div>
                  } @else {
                    <span>{{ acc.name }}</span>
                    <button type="button" class="btn-ghost btn-sm name-edit__trigger" (click)="startNameEdit()">
                      Editar
                    </button>
                  }
                </dd>
              </div>
              <div>
                <dt>Slug</dt>
                <dd><code>{{ acc.slug }}</code></dd>
              </div>
              <div>
                <dt>Produto</dt>
                <dd><code>{{ acc.productId }}</code></dd>
              </div>
              <div>
                <dt>Tenant</dt>
                <dd><code>{{ acc.tenantId ?? '—' }}</code></dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    class="badge"
                    [class.badge--on]="acc.isActive"
                    [class.badge--off]="!acc.isActive"
                  >
                    {{ acc.isActive ? 'Ativa' : 'Inativa' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Criada em</dt>
                <dd class="muted">{{ acc.createdAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
              @if (acc.updatedAt) {
                <div>
                  <dt>Atualizada em</dt>
                  <dd class="muted">{{ acc.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
                </div>
              }
            </dl>

            <div class="actions">
              <a
                class="btn-ghost link-btn"
                [routerLink]="['/campus-notices']"
                [queryParams]="{ accountId: acc.id }"
              >
                Avisos do campus
              </a>
              <button
                type="button"
                class="btn-ghost"
                [disabled]="toggling()"
                (click)="openToggleConfirm()"
              >
                {{ acc.isActive ? 'Desativar conta' : 'Ativar conta' }}
              </button>
            </div>

            @if (actionMessage()) {
              <p class="banner" [class.banner--ok]="actionOk()" [class.banner--error]="!actionOk()">
                {{ actionMessage() }}
              </p>
            }
          </section>

          <section class="card">
            <h2>Assinatura Serímpeto</h2>
            @if (hasSerimpetoMetadata()) {
              <dl class="meta">
                <div>
                  <dt>Plano</dt>
                  <dd>{{ serimpeto().serimpetoPlanId ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Faturamento</dt>
                  <dd>{{ serimpeto().serimpetoBilling ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Assinatura Stripe</dt>
                  <dd>
                    @if (serimpeto().serimpetoStripeSubscriptionId) {
                      <code>{{ maskPartialId(serimpeto().serimpetoStripeSubscriptionId) }}</code>
                      <a
                        class="external-link"
                        [href]="stripeSubscriptionUrl(serimpeto().serimpetoStripeSubscriptionId)"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver no Stripe
                      </a>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt>Sessão de checkout</dt>
                  <dd>
                    @if (serimpeto().serimpetoSessionId) {
                      <a
                        class="session-link"
                        [href]="stripeSessionUrl(serimpeto().serimpetoSessionId)"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <code>{{ serimpeto().serimpetoSessionId }}</code>
                      </a>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </dd>
                </div>
              </dl>
            } @else {
              <p class="muted">Nenhum metadado de assinatura Serímpeto disponível para esta conta.</p>
            }
          </section>
        </div>
      }

      @if (activeTab() === 'users') {
        <div class="users-toolbar">
          <label>
            <span>Papel</span>
            <select [(ngModel)]="usersRoleFilter" (ngModelChange)="onUsersFilterChange()">
              @for (option of userRoleOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
          @if (!usersLoading() && !usersError()) {
            <span class="users-toolbar__total">{{ usersTotal() }} usuário(s)</span>
          }
        </div>

        <p class="privacy-note">
          <span class="material-symbols-outlined" aria-hidden="true">privacy_tip</span>
          Dados pessoais exibidos de forma parcial (LGPD). Use apenas para operações administrativas
          necessárias.
        </p>

        @if (usersActionMessage()) {
          <p
            class="banner"
            [class.banner--ok]="usersActionOk()"
            [class.banner--error]="!usersActionOk()"
          >
            {{ usersActionMessage() }}
          </p>
        }

        <app-data-table
          [loading]="usersLoading()"
          [error]="usersError()"
          [empty]="!usersLoading() && !usersError() && !users().length"
          loadingMessage="Carregando usuários…"
          emptyMessage="Nenhum usuário encontrado para esta conta."
        >
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Status</th>
                <th class="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td class="name">{{ user.name }}</td>
                  <td><code>{{ user.maskedEmail }}</code></td>
                  <td>{{ user.role }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge--on]="user.isActive"
                      [class.badge--off]="!user.isActive"
                    >
                      {{ user.isActive ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-ghost btn-sm"
                      [disabled]="userTogglingId() === user.id"
                      (click)="openUserToggleConfirm(user)"
                    >
                      {{ user.isActive ? 'Desativar' : 'Ativar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </app-data-table>

        @if (!usersLoading() && !usersError() && usersTotal() > 0) {
          <nav class="pagination" aria-label="Paginação de usuários da conta">
            <span class="pagination__info">{{ usersRangeLabel() }} de {{ usersTotal() }}</span>
            <div class="pagination__controls">
              <button
                type="button"
                class="btn-ghost btn-sm"
                [disabled]="usersPageIndex() === 0 || usersLoading()"
                (click)="goToUsersPage(usersPageIndex() - 1)"
              >
                Anterior
              </button>
              <span class="pagination__page">
                Página {{ usersPageIndex() + 1 }} / {{ usersTotalPages() }}
              </span>
              <button
                type="button"
                class="btn-ghost btn-sm"
                [disabled]="usersPageIndex() >= usersTotalPages() - 1 || usersLoading()"
                (click)="goToUsersPage(usersPageIndex() + 1)"
              >
                Próxima
              </button>
            </div>
          </nav>
        }
      }

      @if (activeTab() === 'stats') {
        @if (statsLoading()) {
          <p class="muted">Carregando estatísticas…</p>
        } @else if (statsError()) {
          <p class="banner banner--error">{{ statsError() }}</p>
        } @else if (stats(); as data) {
          <section class="stats-grid" aria-label="Estatísticas da conta">
            <article class="stat-card">
              <span class="stat-card__label">Alunos ativos</span>
              <span class="stat-card__value">{{ data.activeStudents | number }}</span>
            </article>
            <article class="stat-card">
              <span class="stat-card__label">Check-ins 7d</span>
              <span class="stat-card__value">{{ data.checkIns7d | number }}</span>
            </article>
            <article class="stat-card">
              <span class="stat-card__label">Atividades ativas</span>
              <span class="stat-card__value">{{ data.activeAssignments | number }}</span>
            </article>
            <article class="stat-card">
              <span class="stat-card__label">Conformidade</span>
              <span class="stat-card__value">{{ data.compliancePercent | number: '1.0-1' }}%</span>
            </article>
          </section>
        }
      }

      @if (activeTab() === 'feed') {
        <section class="card feed-tab">
          <h2>Moderação do feed</h2>
          <p class="muted">
            Visualize e modere publicações desta conta com o escopo aplicado automaticamente.
          </p>
          <button type="button" class="btn-primary" (click)="openFeedModeration()">
            Abrir moderação do feed
          </button>
        </section>
      }
    }

    <app-confirm-dialog
      [open]="toggleConfirmOpen()"
      [title]="toggleConfirmTitle()"
      [message]="toggleConfirmMessage()"
      confirmLabel="Confirmar"
      cancelLabel="Cancelar"
      (confirmed)="confirmToggle()"
      (cancelled)="toggleConfirmOpen.set(false)"
    />

    <app-confirm-dialog
      [open]="userToggleConfirmOpen()"
      [title]="userToggleConfirmTitle()"
      [message]="userToggleConfirmMessage()"
      confirmLabel="Confirmar"
      cancelLabel="Cancelar"
      (confirmed)="confirmUserToggle()"
      (cancelled)="userToggleConfirmOpen.set(false)"
    />
  `,
  styles: `
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: var(--dwa-text-muted);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .back-link:hover {
      color: var(--dwa-gold-highlight);
    }

    .back-link .material-symbols-outlined {
      font-size: 1.125rem;
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border: 1px solid #333;
      border-radius: var(--dwa-radius-md);
      background: var(--dwa-bg-muted);
      color: var(--dwa-text-muted);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
    }

    .tab:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .tab--active:not(:disabled) {
      border-color: rgba(201, 162, 39, 0.45);
      color: var(--dwa-gold-highlight);
      background: rgba(201, 162, 39, 0.08);
    }

    .tab__soon {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dwa-warning);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .card {
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid #333;
      border-radius: var(--dwa-radius-lg);
    }

    .card h2 {
      margin: 0 0 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .meta {
      display: grid;
      gap: 0.875rem;
      margin: 0;
    }

    .meta dt {
      margin: 0;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .meta dd {
      margin: 0.125rem 0 0;
      font-size: 0.9375rem;
      color: var(--dwa-text-primary);
    }

    .actions {
      margin-top: 1.25rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .link-btn {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }

    .external-link {
      display: inline-block;
      margin-left: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--dwa-gold-highlight);
      text-decoration: none;
    }

    .external-link:hover {
      text-decoration: underline;
    }

    .session-link {
      color: var(--dwa-gold-highlight);
      text-decoration: none;
    }

    .session-link:hover code {
      text-decoration: underline;
    }

    .session-link code {
      font-size: 0.8125rem;
    }

    .privacy-note {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0 0 1rem;
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

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .th-actions {
      width: 8rem;
    }

    .name {
      font-weight: 700;
      color: var(--dwa-text-primary);
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
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

    .muted {
      color: var(--dwa-text-muted);
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }

    .banner--ok {
      background: rgba(82, 224, 160, 0.12);
      color: var(--dwa-success);
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }

    .stats-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--dwa-radius-lg);
    }

    .stat-card__label {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .stat-card__value {
      font-family: var(--dwa-font-display);
      font-size: 1.75rem;
      font-weight: 700;
    }

    .feed-tab p {
      margin: 0 0 1rem;
    }

    .name-edit dd {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .name-edit__form {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }

    .name-edit__form input {
      flex: 1 1 180px;
      min-width: 0;
      padding: 0.5rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
    }

    .name-edit__trigger {
      margin-left: 0.25rem;
    }

    .users-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .users-toolbar label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .users-toolbar select {
      min-width: 160px;
      padding: 0.5rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
      text-transform: none;
      letter-spacing: normal;
    }

    .users-toolbar__total {
      font-size: 0.8125rem;
      color: var(--dwa-text-muted);
    }

    .pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1.25rem;
    }

    .pagination__info,
    .pagination__page {
      font-size: 0.8125rem;
      color: var(--dwa-text-muted);
    }

    .pagination__controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
  `,
})
export class AccountsDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountsApi = inject(AccountsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly platformContext = inject(PlatformContextService);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly account = signal<AccountRecord | null>(null);
  readonly toggling = signal(false);
  readonly toggleConfirmOpen = signal(false);
  readonly actionMessage = signal('');
  readonly actionOk = signal(false);

  readonly activeTab = signal<AccountTab>('overview');
  readonly users = signal<AccountUserRecord[]>([]);
  readonly usersTotal = signal(0);
  readonly usersPageIndex = signal(0);
  readonly usersLoading = signal(false);
  readonly usersError = signal('');
  readonly usersLoaded = signal(false);
  usersRoleFilter = '';
  readonly userRoleOptions = USER_ROLE_OPTIONS;

  readonly editingName = signal(false);
  readonly savingName = signal(false);
  editNameValue = '';
  readonly userTogglingId = signal('');
  readonly userToggleConfirmOpen = signal(false);
  readonly pendingUserAction = signal<PendingUserAction | null>(null);
  readonly usersActionMessage = signal('');
  readonly usersActionOk = signal(false);

  readonly stats = signal<AccountDashboardStats | null>(null);
  readonly statsLoading = signal(false);
  readonly statsError = signal('');
  readonly statsLoaded = signal(false);

  readonly tabs: { id: AccountTab; label: string; disabled: boolean }[] = [
    { id: 'overview', label: 'Visão geral', disabled: false },
    { id: 'users', label: 'Usuários', disabled: false },
    { id: 'stats', label: 'Estatísticas', disabled: false },
    { id: 'feed', label: 'Feed', disabled: false },
  ];

  readonly serimpeto = computed<SerimpetoMetadata>(() => {
    return (
      this.account()?.serimpeto ?? {
        serimpetoSessionId: null,
        serimpetoPlanId: null,
        serimpetoSegment: null,
        serimpetoBilling: null,
        serimpetoStripeSubscriptionId: null,
      }
    );
  });

  readonly hasSerimpetoMetadata = computed(() => {
    const s = this.serimpeto();
    return Boolean(
      s.serimpetoPlanId ||
        s.serimpetoBilling ||
        s.serimpetoSessionId ||
        s.serimpetoStripeSubscriptionId,
    );
  });

  readonly toggleConfirmTitle = computed(() =>
    this.account()?.isActive ? 'Desativar conta' : 'Ativar conta',
  );

  readonly toggleConfirmMessage = computed(() => {
    const acc = this.account();
    if (!acc) {
      return '';
    }
    return acc.isActive
      ? `Deseja desativar a conta "${acc.name}"? Usuários podem perder acesso.`
      : `Deseja reativar a conta "${acc.name}"?`;
  });

  readonly userToggleConfirmTitle = computed(() => {
    const pending = this.pendingUserAction();
    return pending?.activate ? 'Ativar usuário' : 'Desativar usuário';
  });

  readonly userToggleConfirmMessage = computed(() => {
    const pending = this.pendingUserAction();
    if (!pending) {
      return '';
    }
    return pending.activate
      ? `Deseja reativar o acesso de "${pending.user.name}"?`
      : `Deseja desativar o acesso de "${pending.user.name}"?`;
  });

  readonly usersTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.usersTotal() / USERS_PAGE_SIZE)),
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')?.trim();
    if (!id) {
      this.loadError.set('ID da conta inválido.');
      this.loading.set(false);
      return;
    }
    this.loadAccount(id);
  }

  maskPartialId(value: string | null): string {
    if (!value?.trim()) {
      return '—';
    }

    const id = value.trim();
    if (id.length <= 8) {
      return `${id.slice(0, 2)}***`;
    }

    return `${id.slice(0, 6)}***${id.slice(-4)}`;
  }

  stripeSessionUrl(sessionId: string | null): string {
    return `https://dashboard.stripe.com/search?query=${encodeURIComponent(sessionId ?? '')}`;
  }

  stripeSubscriptionUrl(subscriptionId: string | null): string {
    return `https://dashboard.stripe.com/search?query=${encodeURIComponent(subscriptionId ?? '')}`;
  }

  selectTab(tabId: AccountTab): void {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab || tab.disabled) {
      return;
    }
    this.activeTab.set(tabId);
    if (tabId === 'users' && !this.usersLoaded()) {
      this.loadUsers();
    }
    if (tabId === 'stats' && !this.statsLoaded()) {
      this.loadStats();
    }
  }

  startNameEdit(): void {
    const acc = this.account();
    if (!acc) {
      return;
    }
    this.editNameValue = acc.name;
    this.editingName.set(true);
    this.actionMessage.set('');
  }

  cancelNameEdit(): void {
    this.editingName.set(false);
    this.editNameValue = '';
  }

  saveName(): void {
    const acc = this.account();
    const name = this.editNameValue.trim();
    if (!acc || !name || name === acc.name) {
      this.cancelNameEdit();
      return;
    }

    this.savingName.set(true);
    this.actionMessage.set('');

    this.accountsApi.patch(acc.id, { name }).subscribe({
      next: (res) => {
        this.account.set(res.account);
        this.editingName.set(false);
        this.actionOk.set(true);
        this.actionMessage.set('Nome da conta atualizado.');
        this.savingName.set(false);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(friendlyPlatformApiError(err, 'Falha ao atualizar nome da conta.'));
        this.savingName.set(false);
      },
    });
  }

  openFeedModeration(): void {
    const acc = this.account();
    if (!acc) {
      return;
    }
    this.platformContext.setFromAccount(acc);
    void this.router.navigate(['/feed-moderation'], { queryParams: { labelId: acc.id } });
  }

  onUsersFilterChange(): void {
    this.usersPageIndex.set(0);
    this.loadUsers();
  }

  goToUsersPage(index: number): void {
    if (index < 0 || index >= this.usersTotalPages()) {
      return;
    }
    this.usersPageIndex.set(index);
    this.loadUsers();
  }

  usersRangeLabel(): string {
    const total = this.usersTotal();
    if (total === 0) {
      return '0';
    }
    const start = this.usersPageIndex() * USERS_PAGE_SIZE + 1;
    const end = Math.min(start + this.users().length - 1, total);
    return `${start}–${end}`;
  }

  openToggleConfirm(): void {
    this.actionMessage.set('');
    this.toggleConfirmOpen.set(true);
  }

  confirmToggle(): void {
    const acc = this.account();
    if (!acc) {
      return;
    }

    this.toggleConfirmOpen.set(false);
    this.toggling.set(true);
    this.actionMessage.set('');

    this.accountsApi.patch(acc.id, { isActive: !acc.isActive }).subscribe({
      next: (res) => {
        this.account.set(res.account);
        this.actionOk.set(true);
        this.actionMessage.set(acc.isActive ? 'Conta desativada.' : 'Conta ativada.');
        this.toggling.set(false);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(
          friendlyPlatformApiError(err, 'Falha ao atualizar status da conta.'),
        );
        this.toggling.set(false);
      },
    });
  }

  openUserToggleConfirm(user: AccountUserRecord): void {
    this.usersActionMessage.set('');
    this.pendingUserAction.set({ user, activate: !user.isActive });
    this.userToggleConfirmOpen.set(true);
  }

  confirmUserToggle(): void {
    const pending = this.pendingUserAction();
    if (!pending) {
      return;
    }

    this.userToggleConfirmOpen.set(false);
    this.userTogglingId.set(pending.user.id);
    this.usersActionMessage.set('');

    this.usersApi.patch(pending.user.id, { isActive: pending.activate }).subscribe({
      next: (res) => {
        this.users.update((list) =>
          list.map((u) => (u.id === res.user.id ? res.user : u)),
        );
        this.usersActionOk.set(true);
        this.usersActionMessage.set(pending.activate ? 'Usuário ativado.' : 'Usuário desativado.');
        this.userTogglingId.set('');
        this.pendingUserAction.set(null);
      },
      error: (err) => {
        this.usersActionOk.set(false);
        this.usersActionMessage.set(
          friendlyPlatformApiError(err, 'Falha ao atualizar status do usuário.'),
        );
        this.userTogglingId.set('');
        this.pendingUserAction.set(null);
      },
    });
  }

  private loadAccount(id: string): void {
    this.loading.set(true);
    this.loadError.set('');

    this.accountsApi.getById(id).subscribe({
      next: (res) => {
        this.account.set(res.account);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar conta.'));
        this.loading.set(false);
      },
    });
  }

  private loadUsers(): void {
    const accountId = this.account()?.id;
    if (!accountId) {
      return;
    }

    this.usersLoading.set(true);
    this.usersError.set('');

    this.usersApi
      .listByAccount(accountId, {
        role: this.usersRoleFilter.trim() || undefined,
        limit: USERS_PAGE_SIZE,
        offset: this.usersPageIndex() * USERS_PAGE_SIZE,
      })
      .subscribe({
      next: (res) => {
        this.users.set(res.users ?? []);
        this.usersTotal.set(res.total ?? res.users?.length ?? 0);
        this.usersLoaded.set(true);
        this.usersLoading.set(false);
      },
      error: (err) => {
        this.usersError.set(
          friendlyPlatformApiError(err, 'Falha ao carregar usuários da conta.'),
        );
        this.usersLoading.set(false);
      },
    });
  }

  private loadStats(): void {
    const accountId = this.account()?.id;
    if (!accountId) {
      return;
    }

    this.statsLoading.set(true);
    this.statsError.set('');

    this.analyticsApi.accountStats(accountId).subscribe({
      next: (res) => {
        this.stats.set(res.stats);
        this.statsLoaded.set(true);
        this.statsLoading.set(false);
      },
      error: (err) => {
        this.statsError.set(
          friendlyPlatformApiError(err, 'Falha ao carregar estatísticas da conta.'),
        );
        this.statsLoading.set(false);
      },
    });
  }
}
