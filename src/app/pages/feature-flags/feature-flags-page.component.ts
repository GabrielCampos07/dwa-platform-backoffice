import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  FeatureFlagsApiService,
  labelForFlagKey,
} from '../../core/api/feature-flags-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';
import { RealtimeService } from '../../core/realtime/realtime.service';

type FlagRow = { key: string; enabled: boolean; dirty: boolean };

@Component({
  selector: 'app-feature-flags-page',
  imports: [FormsModule],
  template: `
    <header class="page-header">
      <h1>Feature flags</h1>
      @if (context.hasValidLabelScope()) {
        <p>
          Funcionalidades da conta <strong>{{ context.labelName() }}</strong>
          <span class="product-tag">{{ context.productId() }}</span>
        </p>
      } @else {
        <p>Selecione uma conta no topo da página para gerenciar as funcionalidades do produto.</p>
      }
      @if (keysFallback()) {
        <p class="keys-hint">Catálogo de flags indisponível na API — usando lista padrão.</p>
      }
    </header>

    @if (!context.hasValidLabelScope()) {
      <p class="banner banner--warn">
        Escolha uma <strong>conta</strong> no seletor de escopo (canto superior) e clique em
        <strong>Aplicar escopo</strong> para carregar as flags.
      </p>
    } @else if (loadError()) {
      <p class="banner banner--error">{{ loadError() }}</p>
    } @else if (loading()) {
      <p>Carregando flags…</p>
    } @else {
      <ul class="flag-grid">
        @for (row of rows(); track row.key) {
          <li class="flag-card">
            <div class="flag-card__text">
              <h3 class="flag-card__title">{{ labelFor(row.key) }}</h3>
              <p class="flag-card__desc"><code>{{ row.key }}</code></p>
            </div>
            <button
              type="button"
              role="switch"
              class="dwa-switch"
              [attr.aria-checked]="row.enabled"
              [attr.aria-label]="labelFor(row.key) + ': ' + (row.enabled ? 'ligado' : 'desligado')"
              (click)="toggle(row.key, !row.enabled)"
            >
              <span class="dwa-switch__thumb"></span>
            </button>
          </li>
        }
      </ul>

      @if (saveMessage()) {
        <p class="banner" [class.banner--ok]="saveOk()" [class.banner--error]="!saveOk()">
          {{ saveMessage() }}
        </p>
      }

      <div class="actions">
        <button type="button" class="btn-primary" [disabled]="!hasDirty() || saving()" (click)="save()">
          {{ saving() ? 'Salvando…' : 'Salvar alterações' }}
        </button>
        <button type="button" class="btn-ghost" [disabled]="!hasDirty() || saving()" (click)="reload()">
          Descartar
        </button>
      </div>
    }
  `,
  styles: `
    .page-header h1 {
      margin: 0 0 0.25rem;
      font-family: var(--dwa-font-display);
    }

    .page-header p {
      margin: 0 0 0.5rem;
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
    }

    .product-tag {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.125rem 0.5rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(201, 162, 39, 0.15);
      border: 1px solid rgba(201, 162, 39, 0.25);
      border-radius: 999px;
      color: var(--dwa-gold-highlight);
    }

    .keys-hint {
      margin: 0 0 1rem;
      font-size: 0.75rem;
      color: var(--dwa-warning);
    }

    .flag-grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .flag-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid #333;
      border-radius: var(--dwa-radius-lg);
    }

    .flag-card__text {
      min-width: 0;
    }

    .flag-card__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--dwa-text-primary);
    }

    .flag-card__desc {
      margin: 0.25rem 0 0;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--dwa-text-muted);
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .banner--ok {
      background: rgba(82, 224, 160, 0.12);
      color: var(--dwa-success);
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }

    .banner--warn {
      background: rgba(255, 200, 87, 0.12);
      color: var(--dwa-warning);
    }
  `,
})
export class FeatureFlagsPageComponent implements OnInit {
  private readonly api = inject(FeatureFlagsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(RealtimeService);
  readonly context = inject(PlatformContextService);

  private flagLabelMap = new Map<string, string>();

  readonly labelFor = (key: string) => labelForFlagKey(key, this.flagLabelMap);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly saveMessage = signal('');
  readonly saveOk = signal(false);
  readonly rows = signal<FlagRow[]>([]);
  readonly keysFallback = signal(false);
  private flagKeys: string[] = [];
  private serverSnapshot = new Map<string, boolean>();

  ngOnInit(): void {
    this.reload();
    this.context.scopeChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    this.realtime.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.type === 'flags_updated') {
        this.reload();
      }
    });
  }

  hasDirty(): boolean {
    return this.rows().some((r) => r.dirty);
  }

  toggle(key: string, enabled: boolean): void {
    this.rows.update((list) =>
      list.map((r) =>
        r.key === key
          ? { ...r, enabled, dirty: this.serverSnapshot.get(key) !== enabled }
          : r,
      ),
    );
    this.saveMessage.set('');
  }

  reload(): void {
    if (!this.context.hasValidLabelScope()) {
      this.loading.set(false);
      this.loadError.set('');
      this.rows.set([]);
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.keysFallback.set(false);

    this.api.resolveFlagKeys().subscribe({
      next: ({ keys, definitions, source }) => {
        this.flagKeys = keys;
        this.flagLabelMap = new Map(definitions.map((d) => [d.key, d.label]));
        this.keysFallback.set(source === 'constants');
        this.loadFlags();
      },
      error: () => {
        this.keysFallback.set(true);
        this.loadFlags();
      },
    });
  }

  save(): void {
    const dirty = this.rows().filter((r) => r.dirty);
    if (!dirty.length) {
      return;
    }

    this.saving.set(true);
    this.saveMessage.set('');
    this.api
      .upsert(dirty.map((r) => ({ key: r.key, enabled: r.enabled, metadata: null })))
      .subscribe({
        next: (res) => {
          this.applyFlags(res.flags);
          this.saveOk.set(true);
          this.saveMessage.set('Flags salvas. Apps conectados recebem updates via WebSocket.');
          this.saving.set(false);
        },
        error: (err) => {
          this.saveOk.set(false);
          this.saveMessage.set(err?.error?.message ?? 'Falha ao salvar.');
          this.saving.set(false);
        },
      });
  }

  private loadFlags(): void {
    this.api.list().subscribe({
      next: (res) => {
        this.applyFlags(res.flags);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.message ?? 'Falha ao carregar feature flags.');
        this.loading.set(false);
      },
    });
  }

  private applyFlags(flags: { key: string; enabled: boolean }[]): void {
    const byKey = new Map(flags.map((f) => [f.key, f.enabled]));
    this.serverSnapshot = new Map(this.flagKeys.map((k) => [k, byKey.get(k) ?? false]));
    this.rows.set(
      this.flagKeys.map((key) => ({
        key,
        enabled: this.serverSnapshot.get(key) ?? false,
        dirty: false,
      })),
    );
  }
}
