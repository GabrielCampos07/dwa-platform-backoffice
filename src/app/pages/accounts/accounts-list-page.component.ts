import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import { AccountRecord, AccountsApiService } from '../../core/api/accounts-api.service';
import {
  FALLBACK_PRODUCTS,
  ProductRecord,
  ProductsApiService,
} from '../../core/api/products-api.service';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const PAGE_SIZE = 25;
const SEARCH_FETCH_LIMIT = 200;

@Component({
  selector: 'app-accounts-list-page',
  imports: [FormsModule, DatePipe, RouterLink, PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header
      title="Contas"
      description="Lista unificada de contas da plataforma — filtre por produto ou busque por nome/slug."
    />

    <div class="filters">
      <label>
        <span>Produto</span>
        <select [(ngModel)]="selectedProductId" (ngModelChange)="onFiltersChange()">
          <option value="">Todos os produtos</option>
          @for (product of products(); track product.id) {
            <option [value]="product.id">{{ product.name }}</option>
          }
        </select>
      </label>
      <label class="filters__search">
        <span>Buscar</span>
        <input
          type="search"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange()"
          placeholder="Nome ou slug…"
        />
      </label>
      @if (productsFallback()) {
        <p class="filters__hint">
          Catálogo de produtos indisponível — usando fallback
          <code>academia</code> / <code>personal</code>.
        </p>
      }
      @if (searchActive()) {
        <p class="filters__hint filters__hint--search">
          Busca local em nome/slug (a API não expõe parâmetro de busca).
        </p>
      }
    </div>

    <app-data-table
      [loading]="loading()"
      [error]="loadError()"
      [empty]="!loading() && !loadError() && !displayedAccounts().length"
      loadingMessage="Carregando contas…"
      emptyMessage="Nenhuma conta encontrada para o filtro selecionado."
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Slug</th>
            <th>Produto</th>
            <th>Status</th>
            <th>Criada em</th>
          </tr>
        </thead>
        <tbody>
          @for (account of displayedAccounts(); track account.id) {
            <tr class="clickable-row" [routerLink]="['/accounts', account.id]">
              <td class="name">{{ account.name }}</td>
              <td><code>{{ account.slug }}</code></td>
              <td><code>{{ account.productId }}</code></td>
              <td>
                <span
                  class="badge"
                  [class.badge--on]="account.isActive"
                  [class.badge--off]="!account.isActive"
                >
                  {{ account.isActive ? 'Ativa' : 'Inativa' }}
                </span>
              </td>
              <td class="muted">{{ account.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table>

    @if (!loading() && !loadError() && pageTotal() > 0) {
      <nav class="pagination" aria-label="Paginação de contas">
        <span class="pagination__info">
          {{ rangeLabel() }} de {{ pageTotal() }}
        </span>
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
      width: min(240px, 100%);
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
      width: min(280px, 100%);
    }

    .filters select:focus,
    .filters input:focus {
      outline: 2px solid rgba(201, 162, 39, 0.45);
      outline-offset: 1px;
    }

    .filters__hint {
      flex: 1 1 100%;
      margin: 0;
      font-size: 0.75rem;
      color: var(--dwa-warning);
    }

    .filters__hint--search {
      color: var(--dwa-text-muted);
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

    .clickable-row {
      cursor: pointer;
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .name {
      font-weight: 700;
      color: var(--dwa-text-primary);
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
export class AccountsListPageComponent implements OnInit {
  private readonly accountsApi = inject(AccountsApiService);
  private readonly productsApi = inject(ProductsApiService);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly accounts = signal<AccountRecord[]>([]);
  readonly searchPool = signal<AccountRecord[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly products = signal<ProductRecord[]>(FALLBACK_PRODUCTS);
  readonly productsFallback = signal(true);

  selectedProductId = '';
  searchQuery = '';

  readonly searchActive = computed(() => this.searchQuery.trim().length > 0);

  readonly filteredForSearch = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return this.searchPool().filter(
      (account) =>
        account.name.toLowerCase().includes(q) || account.slug.toLowerCase().includes(q),
    );
  });

  readonly displayedAccounts = computed(() => {
    if (this.searchActive()) {
      const start = this.pageIndex() * PAGE_SIZE;
      return this.filteredForSearch().slice(start, start + PAGE_SIZE);
    }
    return this.accounts();
  });

  readonly pageTotal = computed(() =>
    this.searchActive() ? this.filteredForSearch().length : this.total(),
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.pageTotal() / PAGE_SIZE)),
  );

  ngOnInit(): void {
    this.loadProducts();
    this.reloadAccounts();
  }

  onFiltersChange(): void {
    this.pageIndex.set(0);
    this.reloadAccounts();
  }

  onSearchChange(): void {
    this.pageIndex.set(0);
    if (this.searchActive()) {
      this.loadSearchPool();
    } else {
      this.reloadAccounts();
    }
  }

  goToPage(index: number): void {
    if (index < 0 || index >= this.totalPages()) {
      return;
    }
    this.pageIndex.set(index);
    if (!this.searchActive()) {
      this.reloadAccounts();
    }
  }

  rangeLabel(): string {
    const total = this.pageTotal();
    if (total === 0) {
      return '0';
    }
    const start = this.pageIndex() * PAGE_SIZE + 1;
    const end = Math.min(start + this.displayedAccounts().length - 1, total);
    return `${start}–${end}`;
  }

  private loadProducts(): void {
    this.productsApi.list().subscribe({
      next: (res) => {
        if (res.products?.length) {
          this.products.set(res.products);
          this.productsFallback.set(false);
        }
      },
      error: () => {
        this.products.set(FALLBACK_PRODUCTS);
        this.productsFallback.set(true);
      },
    });
  }

  private listFilters(limit: number, offset: number) {
    const filters: { productId?: string; limit: number; offset: number } = { limit, offset };
    if (this.selectedProductId.trim()) {
      filters.productId = this.selectedProductId.trim();
    }
    return filters;
  }

  private reloadAccounts(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.accountsApi.list(this.listFilters(PAGE_SIZE, this.pageIndex() * PAGE_SIZE)).subscribe({
      next: (res) => {
        this.accounts.set(res.accounts ?? []);
        this.total.set(res.total ?? res.accounts?.length ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          friendlyPlatformApiError(err, 'Falha ao carregar contas da platform-api.'),
        );
        this.loading.set(false);
      },
    });
  }

  private loadSearchPool(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.accountsApi.list(this.listFilters(SEARCH_FETCH_LIMIT, 0)).subscribe({
      next: (res) => {
        this.searchPool.set(res.accounts ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          friendlyPlatformApiError(err, 'Falha ao carregar contas para busca.'),
        );
        this.loading.set(false);
      },
    });
  }
}
