import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_LABELS,
  type FeatureFlagKey,
} from '../../core/constants';
import { FeatureFlagsApiService } from '../../core/api/feature-flags-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';

type FlagRow = { key: FeatureFlagKey; enabled: boolean; dirty: boolean };

@Component({
  selector: 'app-feature-flags-page',
  imports: [FormsModule],
  template: `
    <header class="page-header">
      <h1>Feature flags</h1>
      <p>
        Escopo <code>{{ context.scopeLabel() }}</code> — internal
        <code>GET/PUT /internal/v1/tenants/…/products/…/feature-flags</code>
      </p>
    </header>

    @if (!context.hasScope()) {
      <p class="banner banner--warn">
        Defina <strong>tenantId</strong> e <strong>productId</strong> na barra de contexto para carregar
        flags.
      </p>
    } @else if (loadError()) {
      <p class="banner banner--error">{{ loadError() }}</p>
    } @else if (loading()) {
      <p>Carregando flags…</p>
    } @else {
      <ul class="flag-list">
        @for (row of rows(); track row.key) {
          <li class="flag-row">
            <label class="flag-row__toggle">
              <input
                type="checkbox"
                [checked]="row.enabled"
                (change)="toggle(row.key, $any($event.target).checked)"
              />
              <span class="flag-row__key">{{ row.key }}</span>
            </label>
            <p class="flag-row__desc">{{ labels[row.key] }}</p>
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
      margin: 0 0 1.5rem;
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
    }

    .flag-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .flag-row {
      padding: 1rem 1.25rem;
      background: var(--dwa-bg-elevated);
      border-radius: var(--dwa-radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .flag-row__toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      font-weight: 600;
    }

    .flag-row__key {
      font-family: ui-monospace, monospace;
      color: var(--dwa-gold-highlight);
    }

    .flag-row__desc {
      margin: 0.5rem 0 0 1.75rem;
      font-size: 0.8125rem;
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
  readonly context = inject(PlatformContextService);

  readonly labels = FEATURE_FLAG_LABELS;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly saveMessage = signal('');
  readonly saveOk = signal(false);
  readonly rows = signal<FlagRow[]>([]);
  private serverSnapshot = new Map<FeatureFlagKey, boolean>();

  ngOnInit(): void {
    this.reload();
  }

  hasDirty(): boolean {
    return this.rows().some((r) => r.dirty);
  }

  toggle(key: FeatureFlagKey, enabled: boolean): void {
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
    if (!this.context.hasScope()) {
      this.loading.set(false);
      this.loadError.set('');
      this.rows.set([]);
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.api.list().subscribe({
      next: (res) => {
        const byKey = new Map(res.flags.map((f) => [f.key as FeatureFlagKey, f.enabled]));
        this.serverSnapshot = new Map(
          FEATURE_FLAG_KEYS.map((k) => [k, byKey.get(k) ?? false]),
        );
        this.rows.set(
          FEATURE_FLAG_KEYS.map((key) => ({
            key,
            enabled: this.serverSnapshot.get(key) ?? false,
            dirty: false,
          })),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.message ?? 'Falha ao carregar feature flags.');
        this.loading.set(false);
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
          this.serverSnapshot = new Map(
            res.flags.map((f) => [f.key as FeatureFlagKey, f.enabled]),
          );
          this.rows.set(
            FEATURE_FLAG_KEYS.map((key) => ({
              key,
              enabled: this.serverSnapshot.get(key) ?? false,
              dirty: false,
            })),
          );
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
}
