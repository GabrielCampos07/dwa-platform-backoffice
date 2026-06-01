import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LabelsApiService } from '../../core/api/labels-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Component({
  selector: 'app-label-form-page',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="page-header">
      <a routerLink="/labels" class="back">← Labels</a>
      <h1>{{ isNew() ? 'Nova label' : 'Editar label' }}</h1>
    </header>

    @if (loadError()) {
      <p class="banner banner--error">{{ loadError() }}</p>
    } @else if (loading()) {
      <p>Carregando…</p>
    } @else {
      <form class="form" (ngSubmit)="submit()">
        @if (isNew()) {
          <div class="field-row">
            <div class="field">
              <label for="tenantId">Tenant ID</label>
              <input id="tenantId" name="tenantId" type="text" [(ngModel)]="tenantId" required />
            </div>
            <div class="field">
              <label for="productId">Product ID</label>
              <input id="productId" name="productId" type="text" [(ngModel)]="productId" required />
            </div>
          </div>

          <div class="field">
            <label for="slug">Slug</label>
            <input
              id="slug"
              name="slug"
              type="text"
              [(ngModel)]="slug"
              placeholder="ex.: minha-academia"
              required
            />
            <span class="hint">Kebab-case, URL-safe (a-z, 0-9, hífen)</span>
          </div>
        } @else {
          <dl class="meta">
            <dt>Slug</dt>
            <dd><code>{{ slug }}</code></dd>
            <dt>Escopo</dt>
            <dd><code>{{ tenantId }}/{{ productId }}</code></dd>
          </dl>
        }

        <div class="field">
          <label for="name">Nome</label>
          <input id="name" name="name" type="text" [(ngModel)]="name" required />
        </div>

        @if (!isNew()) {
          <div class="field field--checkbox">
            <label>
              <input type="checkbox" name="isActive" [(ngModel)]="isActive" />
              Label ativa
            </label>
          </div>
        }

        <div class="field">
          <label for="brandConfig">brandConfig (JSON)</label>
          <textarea
            id="brandConfig"
            name="brandConfig"
            rows="12"
            [(ngModel)]="brandConfigJson"
            placeholder='{ "theme": { "primary": "#c9a227" } }'
          ></textarea>
          @if (jsonError()) {
            <span class="field-error">{{ jsonError() }}</span>
          } @else {
            <span class="hint">Objeto JSON — tokens de tema, URLs de assets, overrides i18n</span>
          }
        </div>

        @if (saveMessage()) {
          <p class="banner" [class.banner--ok]="saveOk()" [class.banner--error]="!saveOk()">
            {{ saveMessage() }}
          </p>
        }

        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="saving() || !canSubmit()">
            {{ saving() ? 'Salvando…' : isNew() ? 'Criar label' : 'Salvar alterações' }}
          </button>
          @if (!isNew()) {
            <button type="button" class="btn-ghost" [disabled]="exporting()" (click)="exportLabel()">
              {{ exporting() ? 'Exportando…' : 'Exportar bundle' }}
            </button>
          }
          <a routerLink="/labels" class="btn-ghost link-btn">Cancelar</a>
        </div>

        @if (exportJson()) {
          <div class="export">
            <h2>Export</h2>
            <pre>{{ exportJson() }}</pre>
          </div>
        }
      </form>
    }
  `,
  styles: `
    .page-header h1 {
      margin: 0.5rem 0 1.5rem;
      font-family: var(--dwa-font-display);
    }

    .back {
      color: var(--dwa-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .back:hover {
      color: var(--dwa-gold-highlight);
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 640px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .field label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
    }

    .field--checkbox label {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--dwa-text-primary);
    }

    .hint {
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
    }

    .field-error {
      font-size: 0.75rem;
      color: var(--dwa-danger);
    }

    .meta {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25rem 1rem;
      margin: 0;
      padding: 1rem;
      background: var(--dwa-bg-elevated);
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
    }

    .meta dt {
      color: var(--dwa-text-muted);
    }

    .meta dd {
      margin: 0;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-top: 0.5rem;
    }

    .link-btn {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
    }

    .banner--ok {
      background: rgba(82, 224, 160, 0.12);
      color: var(--dwa-success);
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }

    .export {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--dwa-bg-elevated);
      border-radius: var(--dwa-radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .export h2 {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
    }

    .export pre {
      margin: 0;
      overflow-x: auto;
      font-size: 0.75rem;
      line-height: 1.45;
    }
  `,
})
export class LabelFormPageComponent implements OnInit {
  private readonly api = inject(LabelsApiService);
  private readonly context = inject(PlatformContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isNew = signal(true);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly exporting = signal(false);
  readonly loadError = signal('');
  readonly saveMessage = signal('');
  readonly saveOk = signal(false);
  readonly jsonError = signal('');
  readonly exportJson = signal('');

  labelId = '';
  tenantId = '';
  productId = '';
  slug = '';
  name = '';
  isActive = true;
  brandConfigJson = '{}';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.labelId = id;
      this.loadLabel(id);
    } else {
      this.tenantId = this.context.tenantId();
      this.productId = this.context.productId();
    }
  }

  canSubmit(): boolean {
    if (!this.name.trim()) {
      return false;
    }
    if (this.isNew()) {
      return Boolean(this.tenantId.trim() && this.productId.trim() && this.slug.trim() && !this.jsonError());
    }
    return !this.jsonError();
  }

  private loadLabel(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (res) => {
        const label = res.label;
        this.tenantId = label.tenantId;
        this.productId = label.productId;
        this.slug = label.slug;
        this.name = label.name;
        this.isActive = label.isActive;
        this.brandConfigJson = JSON.stringify(label.brandConfig ?? {}, null, 2);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.message ?? 'Label não encontrada ou API indisponível.');
        this.loading.set(false);
      },
    });
  }

  private parseBrandConfig(): Record<string, unknown> | null {
    const raw = this.brandConfigJson.trim();
    if (!raw) {
      this.jsonError.set('');
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.jsonError.set('brandConfig deve ser um objeto JSON.');
        return null;
      }
      this.jsonError.set('');
      return parsed as Record<string, unknown>;
    } catch {
      this.jsonError.set('JSON inválido.');
      return null;
    }
  }

  submit(): void {
    const brandConfig = this.parseBrandConfig();
    if (brandConfig === null) {
      return;
    }

    if (this.isNew()) {
      if (!SLUG_PATTERN.test(this.slug.trim())) {
        this.saveOk.set(false);
        this.saveMessage.set('Slug inválido — use kebab-case (ex.: minha-academia).');
        return;
      }

      this.saving.set(true);
      this.saveMessage.set('');
      this.api
        .create({
          tenantId: this.tenantId.trim(),
          productId: this.productId.trim(),
          slug: this.slug.trim(),
          name: this.name.trim(),
          brandConfig,
          isActive: true,
        })
        .subscribe({
          next: (res) => {
            void this.router.navigate(['/labels', res.label.id]);
          },
          error: (err) => {
            this.saveOk.set(false);
            this.saveMessage.set(err?.error?.message ?? 'Falha ao criar label.');
            this.saving.set(false);
          },
        });
      return;
    }

    this.saving.set(true);
    this.saveMessage.set('');
    this.api
      .update(this.labelId, {
        name: this.name.trim(),
        brandConfig,
        isActive: this.isActive,
      })
      .subscribe({
        next: () => {
          this.saveOk.set(true);
          this.saveMessage.set('Label salva.');
          this.saving.set(false);
        },
        error: (err) => {
          this.saveOk.set(false);
          this.saveMessage.set(err?.error?.message ?? 'Falha ao salvar.');
          this.saving.set(false);
        },
      });
  }

  exportLabel(): void {
    this.exporting.set(true);
    this.exportJson.set('');
    this.api.export(this.labelId).subscribe({
      next: (res) => {
        this.exportJson.set(JSON.stringify(res, null, 2));
        this.exporting.set(false);
      },
      error: (err) => {
        this.saveOk.set(false);
        this.saveMessage.set(err?.error?.message ?? 'Export falhou.');
        this.exporting.set(false);
      },
    });
  }
}
