import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  DeveloperAnnouncementRecord,
  DeveloperAnnouncementSeverity,
  DeveloperAnnouncementsApiService,
} from '../../core/api/developer-announcements-api.service';

const SEVERITIES: { value: DeveloperAnnouncementSeverity; label: string }[] = [
  { value: 'INFO', label: 'Informação' },
  { value: 'WARNING', label: 'Aviso' },
  { value: 'CRITICAL', label: 'Crítico' },
];

@Component({
  selector: 'app-developer-announcements-form-page',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="page-header">
      <a routerLink="/developer-announcements" class="back">← Avisos de desenvolvedor</a>
      <h1>{{ pageTitle() }}</h1>
      @if (record(); as item) {
        <p class="status-line">
          Status:
          <span class="badge" [class]="statusBadgeClass(item.status)">{{ statusLabel(item.status) }}</span>
        </p>
      }
    </header>

    @if (loadError()) {
      <p class="banner banner--error">{{ loadError() }}</p>
    } @else if (loading()) {
      <p class="muted">Carregando…</p>
    } @else {
      <form class="form" (ngSubmit)="submit()">
        <div class="field">
          <label for="title">Título</label>
          <input id="title" name="title" type="text" [(ngModel)]="title" [readonly]="readOnly()" required />
        </div>

        <div class="field">
          <label for="severity">Severidade</label>
          <select id="severity" name="severity" [(ngModel)]="severity" [disabled]="readOnly()" required>
            @for (opt of severities; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="body">Conteúdo</label>
          <textarea id="body" name="body" rows="8" [(ngModel)]="body" [readonly]="readOnly()" required></textarea>
        </div>

        @if (!readOnly()) {
          <div class="preview-actions">
            <button type="button" class="btn-ghost btn-sm" (click)="showSeverityPreview.set(true)">
              Pré-visualizar exibição
            </button>
          </div>
        }

        @if (saveMessage()) {
          <p class="banner" [class.banner--ok]="saveOk()" [class.banner--error]="!saveOk()">
            {{ saveMessage() }}
          </p>
        }

        <div class="actions">
          @if (!readOnly()) {
            <button type="submit" class="btn-primary" [disabled]="saving() || !canSubmit()">
              {{ saving() ? 'Salvando…' : isNew() ? 'Criar aviso' : 'Salvar alterações' }}
            </button>
          }
          <a routerLink="/developer-announcements" class="btn-ghost link-btn">Voltar</a>
        </div>
      </form>
    }

    @if (showSeverityPreview()) {
      @if (severity === 'CRITICAL') {
        <div class="backdrop" (click)="showSeverityPreview.set(false)" role="presentation">
          <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <h2>{{ title.trim() || 'Título do aviso' }}</h2>
            <p>{{ body.trim() || 'Conteúdo do aviso.' }}</p>
            <button type="button" class="btn-primary btn-sm" (click)="showSeverityPreview.set(false)">
              Entendi
            </button>
          </div>
        </div>
      } @else {
        <div class="toast-preview" [class.toast-preview--warning]="severity === 'WARNING'" role="status">
          <strong>{{ title.trim() || 'Título do aviso' }}</strong>
          <p>{{ body.trim() || 'Conteúdo do aviso.' }}</p>
          <button type="button" class="toast-preview__close" (click)="showSeverityPreview.set(false)">
            Fechar
          </button>
        </div>
      }
    }
  `,
  styles: `
    .page-header h1 {
      margin: 0.5rem 0 0.5rem;
      font-family: var(--dwa-font-display);
    }

    .status-line {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--dwa-text-muted);
    }

    .back {
      color: var(--dwa-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .back:hover {
      color: var(--dwa-gold-highlight);
    }

    .badge {
      display: inline-block;
      margin-left: 0.375rem;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge--draft {
      background: rgba(163, 163, 163, 0.1);
      color: var(--dwa-text-muted);
    }

    .badge--live {
      background: rgba(82, 224, 160, 0.1);
      color: var(--dwa-success);
    }

    .badge--ended {
      background: rgba(248, 113, 113, 0.1);
      color: var(--dwa-danger);
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 640px;
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

    .field select,
    .field textarea,
    .field input[readonly] {
      padding: 0.625rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
    }

    .field input[readonly],
    .field textarea[readonly] {
      opacity: 0.85;
    }

    .preview-actions {
      margin-top: -0.25rem;
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

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .muted {
      color: var(--dwa-text-muted);
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

    .toast-preview {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 90;
      width: min(360px, calc(100vw - 2rem));
      padding: 1rem 1.25rem;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid rgba(96, 165, 250, 0.35);
      border-radius: var(--dwa-radius-lg);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    }

    .toast-preview--warning {
      border-color: rgba(255, 200, 87, 0.45);
    }

    .toast-preview strong {
      display: block;
      margin-bottom: 0.375rem;
    }

    .toast-preview p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--dwa-text-muted);
      line-height: 1.45;
    }

    .toast-preview__close {
      margin-top: 0.75rem;
      border: none;
      background: transparent;
      color: var(--dwa-gold-highlight);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
    }

    .modal {
      width: min(420px, 100%);
      padding: 1.5rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(248, 113, 113, 0.35);
      border-radius: var(--dwa-radius-lg);
    }

    .modal h2 {
      margin: 0 0 0.75rem;
      font-family: var(--dwa-font-display);
      color: var(--dwa-danger);
    }

    .modal p {
      margin: 0 0 1.25rem;
      color: var(--dwa-text-muted);
      line-height: 1.5;
    }
  `,
})
export class DeveloperAnnouncementsFormPageComponent implements OnInit {
  private readonly api = inject(DeveloperAnnouncementsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly severities = SEVERITIES;
  readonly isNew = signal(true);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly saveMessage = signal('');
  readonly saveOk = signal(false);
  readonly record = signal<DeveloperAnnouncementRecord | null>(null);
  readonly showSeverityPreview = signal(false);

  readonly readOnly = computed(() => {
    const item = this.record();
    return Boolean(item && item.status !== 'DRAFT');
  });

  readonly pageTitle = computed(() => {
    if (this.isNew()) return 'Novo aviso';
    return this.readOnly() ? 'Visualizar aviso' : 'Editar aviso';
  });

  announcementId = '';
  title = '';
  body = '';
  severity: DeveloperAnnouncementSeverity = 'INFO';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.announcementId = id;
      this.loadAnnouncement(id);
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

  canSubmit(): boolean {
    return Boolean(this.title.trim() && this.body.trim());
  }

  submit(): void {
    if (this.readOnly() || !this.canSubmit()) {
      return;
    }

    const payload = {
      title: this.title.trim(),
      body: this.body.trim(),
      severity: this.severity,
    };

    this.saving.set(true);
    this.saveMessage.set('');

    const request = this.isNew()
      ? this.api.create(payload)
      : this.api.update(this.announcementId, payload);

    request.subscribe({
      next: (res) => {
        if (this.isNew()) {
          void this.router.navigate(['/developer-announcements', res.announcement.id]);
        } else {
          this.record.set(res.announcement);
          this.saveOk.set(true);
          this.saveMessage.set('Aviso salvo.');
          this.saving.set(false);
        }
      },
      error: (err) => {
        this.saveOk.set(false);
        this.saveMessage.set(
          friendlyPlatformApiError(err, 'Falha ao salvar aviso de desenvolvedor.'),
        );
        this.saving.set(false);
      },
    });
  }

  private loadAnnouncement(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (res) => {
        const item = res.announcement;
        this.record.set(item);
        this.title = item.title;
        this.body = item.body;
        this.severity = item.severity;
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          friendlyPlatformApiError(err, 'Aviso não encontrado ou API indisponível.'),
        );
        this.loading.set(false);
      },
    });
  }
}
