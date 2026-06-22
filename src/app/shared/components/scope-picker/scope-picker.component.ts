import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountRecord, AccountsApiService } from '../../../core/api/accounts-api.service';
import { friendlyPlatformApiError } from '../../../core/api/api-error.util';
import { PlatformContextService } from '../../../core/context/platform-context.service';

@Component({
  selector: 'app-scope-picker',
  imports: [FormsModule],
  template: `
    <div class="scope-picker">
      @if (context.hasValidLabelScope()) {
        <div class="scope-chip">
          <span class="scope-chip__icon material-symbols-outlined" aria-hidden="true">corporate_fare</span>
          <div class="scope-chip__text">
            <span class="scope-chip__name">{{ context.labelName() }}</span>
            <span class="scope-chip__meta">
              <code>{{ context.labelSlug() }}</code>
              <span class="scope-chip__product">{{ context.productId() }}</span>
            </span>
          </div>
          <button
            type="button"
            class="scope-chip__clear"
            title="Limpar escopo"
            aria-label="Limpar escopo"
            (click)="clearScope()"
          >
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      } @else {
        <div class="scope-picker__panel" [class.scope-picker__panel--open]="panelOpen()">
          <button
            type="button"
            class="scope-picker__trigger"
            (click)="togglePanel()"
            [attr.aria-expanded]="panelOpen()"
          >
            <span class="material-symbols-outlined" aria-hidden="true">target</span>
            <span>Selecionar conta</span>
            <span class="material-symbols-outlined scope-picker__chevron" aria-hidden="true">
              {{ panelOpen() ? 'expand_less' : 'expand_more' }}
            </span>
          </button>

          @if (panelOpen()) {
            <div class="scope-picker__dropdown">
              <input
                type="search"
                class="scope-picker__search"
                placeholder="Buscar por nome, slug ou produto…"
                [(ngModel)]="searchQuery"
                (ngModelChange)="filterAccounts()"
              />

              @if (accountsLoading()) {
                <p class="scope-picker__status">Carregando contas…</p>
              } @else if (accountsError()) {
                <p class="scope-picker__status scope-picker__status--error">{{ accountsError() }}</p>
              } @else if (!filteredAccounts().length) {
                <p class="scope-picker__status">Nenhuma conta encontrada.</p>
              } @else {
                <ul class="scope-picker__list" role="listbox">
                  @for (account of filteredAccounts(); track account.id) {
                    <li>
                      <button
                        type="button"
                        class="scope-picker__option"
                        [class.scope-picker__option--selected]="pendingAccount()?.id === account.id"
                        (click)="selectAccount(account)"
                      >
                        <span class="scope-picker__option-name">{{ account.name }}</span>
                        <span class="scope-picker__option-meta">
                          <code>{{ account.slug }}</code>
                          <span class="badge" [class.badge--on]="account.isActive" [class.badge--off]="!account.isActive">
                            {{ account.isActive ? 'Ativa' : 'Inativa' }}
                          </span>
                          <span class="product">{{ account.productId }}</span>
                        </span>
                      </button>
                    </li>
                  }
                </ul>
              }

              <div class="scope-picker__actions">
                <button
                  type="button"
                  class="btn-primary btn-sm btn-apply"
                  [disabled]="!pendingAccount()"
                  [title]="!pendingAccount() ? 'Selecione uma conta na lista' : ''"
                  (click)="applyScope()"
                >
                  Aplicar escopo
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .scope-picker {
      position: relative;
      min-width: 0;
    }

    .scope-chip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      max-width: 420px;
      padding: 0.5rem 0.75rem 0.5rem 0.625rem;
      background: rgba(201, 162, 39, 0.08);
      border: 1px solid rgba(201, 162, 39, 0.28);
      border-radius: var(--dwa-radius-md);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    }

    .scope-chip__icon {
      font-size: 1.25rem;
      color: var(--dwa-gold-primary);
      font-variation-settings: 'FILL' 1;
    }

    .scope-chip__text {
      min-width: 0;
      flex: 1;
    }

    .scope-chip__name {
      display: block;
      font-family: var(--dwa-font-display);
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--dwa-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .scope-chip__meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.125rem;
      font-size: 0.6875rem;
      color: var(--dwa-text-muted);
    }

    .scope-chip__product {
      padding: 0.0625rem 0.375rem;
      background: var(--dwa-bg-muted);
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .scope-chip__clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--dwa-text-muted);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .scope-chip__clear:hover {
      background: rgba(248, 113, 113, 0.15);
      color: var(--dwa-danger);
    }

    .scope-picker__trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--dwa-radius-md);
      background: var(--dwa-bg-muted);
      color: var(--dwa-text-primary);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .scope-picker__trigger:hover {
      border-color: rgba(201, 162, 39, 0.35);
      background: rgba(201, 162, 39, 0.06);
    }

    .scope-picker__chevron {
      font-size: 1.125rem;
      color: var(--dwa-text-muted);
    }

    .scope-picker__dropdown {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      z-index: 50;
      width: min(400px, 90vw);
      padding: 0.75rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(201, 162, 39, 0.2);
      border-radius: var(--dwa-radius-lg);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    }

    .scope-picker__search {
      width: 100%;
      margin-bottom: 0.75rem;
    }

    .scope-picker__list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 280px;
      overflow-y: auto;
    }

    .scope-picker__option {
      display: block;
      width: 100%;
      padding: 0.75rem;
      margin-bottom: 0.25rem;
      border: 1px solid transparent;
      border-radius: var(--dwa-radius-md);
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .scope-picker__option:hover {
      background: var(--dwa-bg-muted);
    }

    .scope-picker__option--selected {
      background: rgba(201, 162, 39, 0.1);
      border-color: rgba(201, 162, 39, 0.35);
    }

    .scope-picker__option-name {
      display: block;
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--dwa-text-primary);
    }

    .scope-picker__option-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
    }

    .badge {
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge--on {
      background: rgba(82, 224, 160, 0.15);
      color: var(--dwa-success);
    }

    .badge--off {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }

    .product {
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .scope-picker__status {
      margin: 0 0 0.75rem;
      font-size: 0.8125rem;
      color: var(--dwa-text-muted);
    }

    .scope-picker__status--error {
      color: var(--dwa-danger);
    }

    .scope-picker__actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .btn-apply:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `,
})
export class ScopePickerComponent implements OnInit {
  private readonly accountsApi = inject(AccountsApiService);
  readonly context = inject(PlatformContextService);

  readonly panelOpen = signal(false);
  readonly accountsLoading = signal(false);
  readonly accountsError = signal('');
  readonly pendingAccount = signal<AccountRecord | null>(null);

  private allAccounts = signal<AccountRecord[]>([]);
  readonly filteredAccounts = signal<AccountRecord[]>([]);

  searchQuery = '';

  ngOnInit(): void {
    if (!this.context.hasValidLabelScope()) {
      this.loadAccounts();
    }
  }

  togglePanel(): void {
    const next = !this.panelOpen();
    this.panelOpen.set(next);
    if (next && !this.allAccounts().length) {
      this.loadAccounts();
    }
  }

  selectAccount(account: AccountRecord): void {
    this.pendingAccount.set(account);
  }

  applyScope(): void {
    const account = this.pendingAccount();
    if (!account) {
      return;
    }

    this.accountsApi.getById(account.id).subscribe({
      next: (res) => {
        this.context.setFromAccount(res.account);
        this.finishApplyScope();
      },
      error: () => {
        this.context.setFromAccount(account);
        this.finishApplyScope();
      },
    });
  }

  private finishApplyScope(): void {
    this.panelOpen.set(false);
    this.pendingAccount.set(null);
    this.searchQuery = '';
  }

  clearScope(): void {
    this.context.clearScope();
    this.pendingAccount.set(null);
    this.panelOpen.set(false);
    this.loadAccounts();
  }

  filterAccounts(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredAccounts.set(this.allAccounts());
      return;
    }
    this.filteredAccounts.set(
      this.allAccounts().filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.productId.toLowerCase().includes(q),
      ),
    );
  }

  private loadAccounts(): void {
    this.accountsLoading.set(true);
    this.accountsError.set('');

    this.accountsApi.list().subscribe({
      next: (res) => {
        const accounts = res.accounts ?? [];
        this.allAccounts.set(accounts);
        this.filteredAccounts.set(accounts);
        this.accountsLoading.set(false);

        if (this.context.hasValidLabelScope()) {
          const current = accounts.find((a) => a.id === this.context.labelId());
          if (!current) {
            this.context.clearScope();
          }
        }
      },
      error: (err) => {
        this.accountsError.set(friendlyPlatformApiError(err, 'Falha ao carregar contas.'));
        this.accountsLoading.set(false);
      },
    });
  }
}
