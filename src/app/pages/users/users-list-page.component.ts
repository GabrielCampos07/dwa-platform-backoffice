import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import { AccountRecord, AccountsApiService } from '../../core/api/accounts-api.service';
import { AccountUserRecord, UsersApiService } from '../../core/api/users-api.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const PAGE_SIZE = 50;
const SEARCH_FETCH_LIMIT = 200;

const ROLE_OPTIONS = [
  { value: '', label: 'Todos os papéis' },
  { value: 'admin', label: 'Admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'student', label: 'Aluno' },
];

@Component({
  selector: 'app-users-list-page',
  imports: [FormsModule, RouterLink, PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header
      title="Usuários"
      description="Lista de usuários por conta — a platform-api não expõe endpoint global; selecione uma conta."
    />

    <div class="filters">
      <label>
        <span>Conta</span>
        <select [(ngModel)]="selectedAccountId" (ngModelChange)="onAccountChange()" [disabled]="accountsLoading()">
          <option value="">Selecione uma conta…</option>
          @for (account of accounts(); track account.id) {
            <option [value]="account.id">{{ account.name }} ({{ account.slug }})</option>
          }
        </select>
      </label>
      <label>
        <span>Papel</span>
        <select [(ngModel)]="selectedRole" (ngModelChange)="onFiltersChange()" [disabled]="!selectedAccountId">
          @for (option of roleOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </label>
      <label class="filters__search">
        <span>Buscar</span>
        <input
          type="search"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange()"
          [disabled]="!selectedAccountId"
          placeholder="Nome ou e-mail mascarado…"
        />
      </label>
    </div>

    @if (!selectedAccountId && !accountsLoading()) {
      <p class="muted">Selecione uma conta para listar usuários.</p>
    } @else {
      <p class="privacy-note">
        <span class="material-symbols-outlined" aria-hidden="true">privacy_tip</span>
        Dados pessoais exibidos de forma parcial (LGPD). Busca filtra nome/e-mail no lote carregado.
      </p>

      <app-data-table
        [loading]="loading()"
        [error]="loadError()"
        [empty]="!loading() && !loadError() && !!selectedAccountId && !displayedUsers().length"
        loadingMessage="Carregando usuários…"
        emptyMessage="Nenhum usuário encontrado."
      >
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Conta</th>
            </tr>
          </thead>
          <tbody>
            @for (user of displayedUsers(); track user.id) {
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
                  @if (selectedAccount(); as account) {
                    <a class="account-link" [routerLink]="['/accounts', account.id]">{{ account.name }}</a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-data-table>

      @if (!loading() && !loadError() && selectedAccountId && pageTotal() > 0) {
        <nav class="pagination" aria-label="Paginação de usuários">
          <span class="pagination__info">{{ rangeLabel() }} de {{ pageTotal() }}</span>
          <div class="pagination__controls">
            <button
              type="button"
              class="btn-ghost btn-sm"
              [disabled]="pageIndex() === 0 || loading()"
              (click)="goToPage(pageIndex() - 1)"
            >
              Anterior
            </button>
            <span class="pagination__page">Página {{ pageIndex() + 1 }} / {{ totalPages() }}</span>
            <button
              type="button"
              class="btn-ghost btn-sm"
              [disabled]="pageIndex() >= totalPages() - 1 || loading()"
              (click)="goToPage(pageIndex() + 1)"
            >
              Próxima
            </button>
          </div>
        </nav>
      }
    }
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.25rem;
      align-items: flex-end;
    }

    .filters label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .filters select,
    .filters input {
      min-width: 200px;
      padding: 0.625rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
      text-transform: none;
      letter-spacing: normal;
    }

    .filters__search input {
      min-width: 240px;
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

    .name {
      font-weight: 700;
      color: var(--dwa-text-primary);
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

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }
  `,
})
export class UsersListPageComponent implements OnInit {
  private readonly accountsApi = inject(AccountsApiService);
  private readonly usersApi = inject(UsersApiService);

  readonly accountsLoading = signal(true);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly accounts = signal<AccountRecord[]>([]);
  readonly users = signal<AccountUserRecord[]>([]);
  readonly searchPool = signal<AccountUserRecord[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);

  selectedAccountId = '';
  selectedRole = '';
  searchQuery = '';

  readonly roleOptions = ROLE_OPTIONS;

  readonly selectedAccount = computed(() =>
    this.accounts().find((account) => account.id === this.selectedAccountId) ?? null,
  );

  readonly searchActive = computed(() => this.searchQuery.trim().length > 0);

  readonly filteredForSearch = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return this.searchPool().filter(
      (user) =>
        user.name.toLowerCase().includes(q) || user.maskedEmail.toLowerCase().includes(q),
    );
  });

  readonly displayedUsers = computed(() => {
    if (this.searchActive()) {
      const start = this.pageIndex() * PAGE_SIZE;
      return this.filteredForSearch().slice(start, start + PAGE_SIZE);
    }
    return this.users();
  });

  readonly pageTotal = computed(() =>
    this.searchActive() ? this.filteredForSearch().length : this.total(),
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.pageTotal() / PAGE_SIZE)),
  );

  ngOnInit(): void {
    this.loadAccounts();
  }

  onAccountChange(): void {
    this.pageIndex.set(0);
    this.searchQuery = '';
    if (this.selectedAccountId) {
      this.reloadUsers();
    } else {
      this.users.set([]);
      this.total.set(0);
    }
  }

  onFiltersChange(): void {
    this.pageIndex.set(0);
    if (this.selectedAccountId) {
      if (this.searchActive()) {
        this.loadSearchPool();
      } else {
        this.reloadUsers();
      }
    }
  }

  onSearchChange(): void {
    this.pageIndex.set(0);
    if (!this.selectedAccountId) {
      return;
    }
    if (this.searchActive()) {
      this.loadSearchPool();
    } else {
      this.reloadUsers();
    }
  }

  goToPage(index: number): void {
    if (index < 0 || index >= this.totalPages()) {
      return;
    }
    this.pageIndex.set(index);
    if (!this.searchActive()) {
      this.reloadUsers();
    }
  }

  rangeLabel(): string {
    const total = this.pageTotal();
    if (total === 0) {
      return '0';
    }
    const start = this.pageIndex() * PAGE_SIZE + 1;
    const end = Math.min(start + this.displayedUsers().length - 1, total);
    return `${start}–${end}`;
  }

  private loadAccounts(): void {
    this.accountsLoading.set(true);
    this.accountsApi.list({ limit: 200, offset: 0 }).subscribe({
      next: (res) => {
        this.accounts.set(res.accounts ?? []);
        this.accountsLoading.set(false);
      },
      error: () => {
        this.accounts.set([]);
        this.accountsLoading.set(false);
      },
    });
  }

  private userFilters(limit: number, offset: number) {
    return {
      role: this.selectedRole.trim() || undefined,
      limit,
      offset,
    };
  }

  private reloadUsers(): void {
    if (!this.selectedAccountId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');

    this.usersApi
      .listByAccount(this.selectedAccountId, this.userFilters(PAGE_SIZE, this.pageIndex() * PAGE_SIZE))
      .subscribe({
        next: (res) => {
          this.users.set(res.users ?? []);
          this.total.set(res.total ?? res.users?.length ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar usuários.'));
          this.loading.set(false);
        },
      });
  }

  private loadSearchPool(): void {
    if (!this.selectedAccountId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');

    this.usersApi
      .listByAccount(this.selectedAccountId, this.userFilters(SEARCH_FETCH_LIMIT, 0))
      .subscribe({
        next: (res) => {
          this.searchPool.set(res.users ?? []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar usuários para busca.'));
          this.loading.set(false);
        },
      });
  }
}
