import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import { AccountRecord, AccountsApiService } from '../../core/api/accounts-api.service';
import {
  CampusNoticeBody,
  CampusNoticeIcon,
  CampusNoticeRecord,
  CampusNoticeStatus,
  CampusNoticeVariant,
  CampusNoticesApiService,
} from '../../core/api/campus-notices-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type PendingAction = {
  notice: CampusNoticeRecord;
  action: 'publish' | 'end' | 'cancel' | 'delete';
};

const VARIANT_OPTIONS: { value: CampusNoticeVariant; label: string }[] = [
  { value: 'STANDARD', label: 'Padrão' },
  { value: 'FESTIVE', label: 'Festivo' },
];

const ICON_OPTIONS: { value: CampusNoticeIcon; label: string }[] = [
  { value: 'NONE', label: 'Nenhum' },
  { value: 'SPARKLE', label: '✦ Destaque' },
  { value: 'TROPHY', label: 'Troféu' },
  { value: 'CALENDAR', label: 'Calendário' },
  { value: 'TOOLS', label: 'Manutenção' },
  { value: 'HEART', label: 'Comunidade' },
];

const PRIORITY_OPTIONS = [
  { value: 0, label: 'Baixa (0)' },
  { value: 5, label: 'Normal (5)' },
  { value: 10, label: 'Alta (10)' },
];

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'SCHEDULED', label: 'Agendado' },
  { value: 'LIVE', label: 'Ao vivo' },
  { value: 'ENDED', label: 'Encerrado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

@Component({
  selector: 'app-campus-notices-page',
  imports: [
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    DataTableComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <app-page-header
      title="Avisos do campus"
      description="Banners e promoções exibidos na home dos alunos de uma conta."
    />

    <div class="filters">
      @if (context.hasValidLabelScope()) {
        <div class="scope-chip-inline">
          <span class="material-symbols-outlined" aria-hidden="true">corporate_fare</span>
          <span>
            Conta: <strong>{{ context.labelName() }}</strong>
            <code>{{ context.labelSlug() }}</code>
          </span>
        </div>
      } @else {
        <label>
          <span>Conta</span>
          <select [(ngModel)]="selectedAccountId" (ngModelChange)="onAccountChange()">
            <option value="">Selecione uma conta…</option>
            @for (account of accounts(); track account.id) {
              <option [value]="account.id">{{ account.name }} ({{ account.slug }})</option>
            }
          </select>
        </label>
        <p class="filters__hint">
          Dica: selecione uma conta no topo da página para aplicar o escopo automaticamente.
        </p>
      }

      @if (selectedAccountId) {
        <label class="filters__status">
          <span>Status</span>
          <select [(ngModel)]="filterStatus" (ngModelChange)="reloadNotices()">
            @for (option of statusFilterOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      }

      @if (accountsError()) {
        <p class="filters__hint filters__hint--error">{{ accountsError() }}</p>
      }
    </div>

    @if (!selectedAccountId) {
      <p class="banner banner--warn">
        @if (context.hasValidLabelScope()) {
          Escopo ativo, mas conta não encontrada. Selecione novamente no topo.
        } @else {
          Selecione uma conta no topo da página ou no filtro acima.
        }
      </p>
    } @else {
      <div class="toolbar">
        <button type="button" class="btn-primary btn-sm" (click)="startCreate()">
          Novo aviso
        </button>
      </div>

      @if (formOpen()) {
        <form class="form" (ngSubmit)="submitForm('DRAFT')">
          <h2>{{ editingId() ? 'Editar aviso' : 'Novo aviso' }}</h2>

          <div class="form-grid">
            <div class="field field--wide">
              <label for="noticeTitle">Título</label>
              <input id="noticeTitle" name="noticeTitle" type="text" [(ngModel)]="formTitle" maxlength="80" required />
            </div>
            <div class="field field--wide">
              <label for="noticeBody">Mensagem</label>
              <textarea id="noticeBody" name="noticeBody" rows="4" [(ngModel)]="formBody" maxlength="280" required></textarea>
              <span class="field__hint">{{ formBody.length }} / 280</span>
            </div>
            <div class="field">
              <label for="noticeVariant">Variante</label>
              <select id="noticeVariant" name="noticeVariant" [(ngModel)]="formVariant">
                @for (opt of variantOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="noticeIcon">Ícone</label>
              <select id="noticeIcon" name="noticeIcon" [(ngModel)]="formIcon">
                @for (opt of iconOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="noticePriority">Prioridade</label>
              <select id="noticePriority" name="noticePriority" [(ngModel)]="formPriority">
                @for (opt of priorityOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <label class="field field--checkbox">
              <input type="checkbox" name="dismissible" [(ngModel)]="formDismissible" />
              <span>Permite dispensar</span>
            </label>
            <div class="field field--wide">
              <label for="linkUrl">Link (HTTPS)</label>
              <input id="linkUrl" name="linkUrl" type="url" [(ngModel)]="formLinkUrl" placeholder="https://…" />
            </div>
            <div class="field field--wide">
              <label for="linkLabel">Rótulo do link</label>
              <input id="linkLabel" name="linkLabel" type="text" [(ngModel)]="formLinkLabel" maxlength="40" />
            </div>
            <div class="field">
              <label for="startsAt">Início (agendar)</label>
              <input id="startsAt" name="startsAt" type="datetime-local" [(ngModel)]="formStartsAt" />
            </div>
            <div class="field">
              <label for="endsAt">Fim</label>
              <input id="endsAt" name="endsAt" type="datetime-local" [(ngModel)]="formEndsAt" />
            </div>
          </div>

          <section class="preview">
            <h3>Pré-visualização</h3>
            <div class="preview-band" [class.preview-band--festive]="formVariant === 'FESTIVE'">
              @if (formIcon !== 'NONE') {
                <span class="preview-band__icon material-symbols-outlined" aria-hidden="true">{{ iconSymbol(formIcon) }}</span>
              }
              <div class="preview-band__text">
                <strong>{{ formTitle.trim() || 'Título do aviso' }}</strong>
                <p>{{ formBody.trim() || 'Mensagem curta para os alunos.' }}</p>
                @if (formLinkUrl.trim() && formLinkLabel.trim()) {
                  <span class="preview-band__link">{{ formLinkLabel.trim() }}</span>
                }
              </div>
              @if (formDismissible) {
                <span class="preview-band__dismiss material-symbols-outlined" aria-hidden="true">close</span>
              }
            </div>
            @if (shouldShowModalPreview(formVariant, formPriority)) {
              <button type="button" class="btn-ghost btn-sm preview-modal-btn" (click)="openModalPreviewFromForm()">
                Pré-visualizar popup no app
              </button>
            }
          </section>

          <div class="form__actions">
            <button type="submit" class="btn-primary btn-sm" [disabled]="saving() || !canSubmitForm()">
              {{ saving() ? 'Salvando…' : 'Salvar rascunho' }}
            </button>
            <button
              type="button"
              class="btn-ghost btn-sm"
              [disabled]="saving() || !canSubmitForm() || !formStartsAt"
              (click)="submitForm('SCHEDULED')"
            >
              Agendar
            </button>
            <button type="button" class="btn-ghost btn-sm" (click)="cancelForm()">Cancelar</button>
          </div>
        </form>
      }

      <app-data-table
        [loading]="loading()"
        [error]="loadError()"
        [empty]="!loading() && !loadError() && !notices().length"
        loadingMessage="Carregando avisos…"
        emptyMessage="Nenhum aviso cadastrado para esta conta."
      >
        <table class="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Prioridade</th>
              <th>Publicado / início</th>
              <th class="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (notice of notices(); track notice.id) {
              <tr>
                <td>
                  <span class="name">{{ notice.title }}</span>
                  <span class="muted content-preview">{{ notice.body }}</span>
                </td>
                <td>
                  <span class="badge" [class]="statusBadgeClass(notice.status)">
                    {{ statusLabel(notice.status) }}
                  </span>
                </td>
                <td class="muted">{{ notice.priority ?? 0 }}</td>
                <td class="muted">
                  @if (notice.status === 'SCHEDULED' && notice.startsAt) {
                    {{ notice.startsAt | date: 'dd/MM/yyyy HH:mm' }}
                  } @else if (notice.publishedAt) {
                    {{ notice.publishedAt | date: 'dd/MM/yyyy HH:mm' }}
                  } @else {
                    —
                  }
                </td>
                <td>
                  <div class="row-actions">
                    @if (shouldShowModalPreview(notice.variant, notice.priority)) {
                      <button type="button" class="btn-ghost btn-sm" (click)="openModalPreview(notice)">
                        Popup
                      </button>
                    }
                    @if (notice.status === 'DRAFT' || notice.status === 'SCHEDULED') {
                      <button type="button" class="btn-ghost btn-sm" (click)="startEdit(notice)">
                        Editar
                      </button>
                      <button
                        type="button"
                        class="btn-ghost btn-sm"
                        [disabled]="acting()"
                        (click)="openConfirm(notice, 'publish')"
                      >
                        Publicar
                      </button>
                    }
                    @if (notice.status === 'DRAFT') {
                      <button
                        type="button"
                        class="btn-ghost btn-sm btn-danger-text"
                        [disabled]="acting()"
                        (click)="openConfirm(notice, 'delete')"
                      >
                        Excluir
                      </button>
                    }
                    @if (notice.status === 'LIVE') {
                      <button
                        type="button"
                        class="btn-ghost btn-sm"
                        [disabled]="acting()"
                        (click)="openConfirm(notice, 'end')"
                      >
                        Encerrar
                      </button>
                      <button
                        type="button"
                        class="btn-ghost btn-sm"
                        [disabled]="acting()"
                        (click)="openConfirm(notice, 'cancel')"
                      >
                        Cancelar
                      </button>
                    }
                    @if (notice.status === 'SCHEDULED') {
                      <button
                        type="button"
                        class="btn-ghost btn-sm"
                        [disabled]="acting()"
                        (click)="openConfirm(notice, 'cancel')"
                      >
                        Cancelar
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-data-table>
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
      cancelLabel="Voltar"
      (confirmed)="submitAction()"
      (cancelled)="closeConfirm()"
    />

    @if (modalPreviewOpen()) {
      <div class="modal-backdrop" (click)="closeModalPreview()" role="presentation">
        <div
          class="app-modal"
          [class.app-modal--festive]="modalPreviewVariant() === 'FESTIVE'"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          @if (modalPreviewIcon() !== 'NONE') {
            <span class="app-modal__icon material-symbols-outlined" aria-hidden="true">
              {{ iconSymbol(modalPreviewIcon()) }}
            </span>
          }
          <h2>{{ modalPreviewTitle() }}</h2>
          <p>{{ modalPreviewBody() }}</p>
          @if (modalPreviewLinkLabel()) {
            <span class="app-modal__link">{{ modalPreviewLinkLabel() }}</span>
          }
          <button type="button" class="btn-primary btn-sm" (click)="closeModalPreview()">
            {{ modalPreviewDismissible() ? 'Fechar' : 'Entendi' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.25rem;
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

    .filters select {
      width: min(360px, 100%);
      padding: 0.625rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
    }

    .filters__status select {
      width: min(200px, 100%);
    }

    .filters__hint {
      margin: 0;
      font-size: 0.75rem;
      width: 100%;
    }

    .filters__hint--error {
      color: var(--dwa-danger);
    }

    .scope-chip-inline {
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

    .scope-chip-inline strong {
      color: var(--dwa-text-primary);
    }

    .scope-chip-inline code {
      margin-left: 0.5rem;
    }

    .toolbar {
      margin-bottom: 1rem;
    }

    .form {
      margin-bottom: 1.25rem;
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid #333;
      border-radius: var(--dwa-radius-lg);
    }

    .form h2 {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--dwa-text-muted);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.875rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .field--wide {
      grid-column: 1 / -1;
    }

    .field--checkbox {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      padding-top: 1.5rem;
      font-size: 0.875rem;
      color: var(--dwa-text-primary);
      text-transform: none;
      letter-spacing: normal;
    }

    .field label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
    }

    .field input,
    .field select,
    .field textarea {
      padding: 0.625rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
    }

    .field__hint {
      font-size: 0.6875rem;
      color: var(--dwa-text-muted);
    }

    .preview {
      margin: 1.25rem 0;
    }

    .preview h3 {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--dwa-text-muted);
    }

    .preview-band {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: rgba(201, 162, 39, 0.12);
      border: 1px solid rgba(201, 162, 39, 0.25);
      border-radius: var(--dwa-radius-md);
    }

    .preview-band--festive {
      background: linear-gradient(135deg, rgba(201, 162, 39, 0.18), rgba(248, 113, 113, 0.12));
    }

    .preview-band__icon {
      color: var(--dwa-gold-highlight);
      flex-shrink: 0;
    }

    .preview-band__text strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    .preview-band__text p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--dwa-text-muted);
    }

    .preview-band__link {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--dwa-gold-highlight);
    }

    .preview-band__dismiss {
      margin-left: auto;
      color: var(--dwa-text-muted);
      font-size: 1.125rem;
    }

    .form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
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

    .name {
      display: block;
      font-weight: 700;
      color: var(--dwa-text-primary);
    }

    .content-preview {
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

    .badge--scheduled {
      background: rgba(96, 165, 250, 0.1);
      border: 1px solid rgba(96, 165, 250, 0.25);
      color: #93c5fd;
    }

    .badge--live {
      background: rgba(82, 224, 160, 0.1);
      border: 1px solid rgba(82, 224, 160, 0.2);
      color: var(--dwa-success);
    }

    .badge--ended,
    .badge--cancelled {
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.2);
      color: var(--dwa-danger);
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .btn-danger-text {
      color: var(--dwa-danger);
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

    .banner--warn {
      background: rgba(255, 200, 87, 0.12);
      color: var(--dwa-warning);
    }

    .preview-modal-btn {
      margin-top: 0.75rem;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
    }

    .app-modal {
      width: min(420px, 100%);
      padding: 1.5rem;
      text-align: center;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(201, 162, 39, 0.35);
      border-radius: var(--dwa-radius-lg);
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
    }

    .app-modal--festive {
      background: linear-gradient(160deg, rgba(201, 162, 39, 0.2), var(--dwa-bg-elevated));
      border-color: rgba(248, 113, 113, 0.35);
    }

    .app-modal__icon {
      display: block;
      margin: 0 auto 0.75rem;
      font-size: 2rem;
      color: var(--dwa-gold-highlight);
    }

    .app-modal h2 {
      margin: 0 0 0.75rem;
      font-family: var(--dwa-font-display);
      font-size: 1.25rem;
    }

    .app-modal p {
      margin: 0 0 1rem;
      color: var(--dwa-text-muted);
      line-height: 1.5;
    }

    .app-modal__link {
      display: inline-block;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--dwa-gold-highlight);
    }
  `,
})
export class CampusNoticesPageComponent implements OnInit {
  private readonly noticesApi = inject(CampusNoticesApiService);
  private readonly accountsApi = inject(AccountsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(RealtimeService);
  readonly context = inject(PlatformContextService);

  readonly variantOptions = VARIANT_OPTIONS;
  readonly iconOptions = ICON_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;

  readonly accounts = signal<AccountRecord[]>([]);
  readonly accountsError = signal('');
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly notices = signal<CampusNoticeRecord[]>([]);
  readonly acting = signal(false);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly confirmOpen = signal(false);
  readonly pendingAction = signal<PendingAction | null>(null);
  readonly actionMessage = signal('');
  readonly actionOk = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmMessage = signal('');

  readonly modalPreviewOpen = signal(false);
  readonly modalPreviewTitle = signal('');
  readonly modalPreviewBody = signal('');
  readonly modalPreviewVariant = signal<CampusNoticeVariant>('STANDARD');
  readonly modalPreviewIcon = signal<CampusNoticeIcon>('NONE');
  readonly modalPreviewLinkLabel = signal('');
  readonly modalPreviewDismissible = signal(true);

  selectedAccountId = '';
  filterStatus = '';
  formTitle = '';
  formBody = '';
  formVariant: CampusNoticeVariant = 'STANDARD';
  formIcon: CampusNoticeIcon = 'NONE';
  formPriority = 5;
  formLinkUrl = '';
  formLinkLabel = '';
  formStartsAt = '';
  formEndsAt = '';
  formDismissible = true;

  readonly previewNotice = computed(() => ({
    title: this.formTitle.trim() || 'Título do aviso',
    body: this.formBody.trim() || 'Mensagem curta para os alunos.',
    variant: this.formVariant,
    icon: this.formIcon,
  }));

  ngOnInit(): void {
    const accountId = this.route.snapshot.queryParamMap.get('accountId')?.trim();
    if (accountId) {
      this.selectedAccountId = accountId;
    } else if (this.context.hasValidLabelScope()) {
      this.selectedAccountId = this.context.labelId();
    }
    this.loadAccounts();

    this.context.scopeChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.context.hasValidLabelScope()) {
        this.selectedAccountId = this.context.labelId();
        this.onAccountChange();
      }
    });

    this.realtime.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (
        event.type === 'campus_notice_published' ||
        event.type === 'campus_notice_updated' ||
        event.type === 'campus_notice_ended' ||
        event.type === 'stats_updated'
      ) {
        if (this.selectedAccountId) {
          this.reloadNotices();
        }
      }
    });
  }

  shouldShowModalPreview(variant?: CampusNoticeVariant | null, priority?: number | null): boolean {
    return variant === 'FESTIVE' || (priority ?? 0) >= 80;
  }

  openModalPreviewFromForm(): void {
    this.modalPreviewTitle.set(this.formTitle.trim() || 'Título do aviso');
    this.modalPreviewBody.set(this.formBody.trim() || 'Mensagem curta para os alunos.');
    this.modalPreviewVariant.set(this.formVariant);
    this.modalPreviewIcon.set(this.formIcon);
    this.modalPreviewLinkLabel.set(
      this.formLinkUrl.trim() && this.formLinkLabel.trim() ? this.formLinkLabel.trim() : '',
    );
    this.modalPreviewDismissible.set(this.formDismissible);
    this.modalPreviewOpen.set(true);
  }

  openModalPreview(notice: CampusNoticeRecord): void {
    this.modalPreviewTitle.set(notice.title);
    this.modalPreviewBody.set(notice.body);
    this.modalPreviewVariant.set(notice.variant ?? 'STANDARD');
    this.modalPreviewIcon.set(notice.icon ?? 'NONE');
    this.modalPreviewLinkLabel.set(
      notice.linkUrl && notice.linkLabel ? notice.linkLabel : '',
    );
    this.modalPreviewDismissible.set(notice.dismissible ?? true);
    this.modalPreviewOpen.set(true);
  }

  closeModalPreview(): void {
    this.modalPreviewOpen.set(false);
  }

  onAccountChange(): void {
    this.cancelForm();
    this.actionMessage.set('');
    this.reloadNotices();
  }

  iconSymbol(icon: CampusNoticeIcon): string {
    switch (icon) {
      case 'SPARKLE':
        return 'auto_awesome';
      case 'TROPHY':
        return 'emoji_events';
      case 'CALENDAR':
        return 'event';
      case 'TOOLS':
        return 'build';
      case 'HEART':
        return 'favorite';
      default:
        return 'campaign';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Rascunho';
      case 'SCHEDULED':
        return 'Agendado';
      case 'LIVE':
        return 'Ao vivo';
      case 'ENDED':
        return 'Encerrado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'badge--draft';
      case 'SCHEDULED':
        return 'badge--scheduled';
      case 'LIVE':
        return 'badge--live';
      case 'ENDED':
        return 'badge--ended';
      case 'CANCELLED':
        return 'badge--cancelled';
      default:
        return 'badge--draft';
    }
  }

  confirmButtonLabel(): string {
    const action = this.pendingAction()?.action;
    if (action === 'publish') return 'Publicar';
    if (action === 'end') return 'Encerrar';
    if (action === 'cancel') return 'Cancelar aviso';
    if (action === 'delete') return 'Excluir';
    return 'Confirmar';
  }

  startCreate(): void {
    this.editingId.set(null);
    this.resetForm();
    this.formOpen.set(true);
  }

  startEdit(notice: CampusNoticeRecord): void {
    this.editingId.set(notice.id);
    this.formTitle = notice.title;
    this.formBody = notice.body;
    this.formVariant = notice.variant ?? 'STANDARD';
    this.formIcon = notice.icon ?? 'NONE';
    this.formPriority = notice.priority ?? 5;
    this.formLinkUrl = notice.linkUrl ?? '';
    this.formLinkLabel = notice.linkLabel ?? '';
    this.formStartsAt = notice.startsAt ? toLocalInput(notice.startsAt) : '';
    this.formEndsAt = notice.endsAt ? toLocalInput(notice.endsAt) : '';
    this.formDismissible = notice.dismissible ?? true;
    this.formOpen.set(true);
  }

  cancelForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
    this.resetForm();
  }

  resetForm(): void {
    this.formTitle = '';
    this.formBody = '';
    this.formVariant = 'STANDARD';
    this.formIcon = 'NONE';
    this.formPriority = 5;
    this.formLinkUrl = '';
    this.formLinkLabel = '';
    this.formStartsAt = '';
    this.formEndsAt = '';
    this.formDismissible = true;
  }

  canSubmitForm(): boolean {
    return Boolean(this.formTitle.trim() && this.formBody.trim() && this.selectedAccountId);
  }

  buildPayload(status?: 'DRAFT' | 'SCHEDULED'): CampusNoticeBody {
    return {
      title: this.formTitle.trim(),
      body: this.formBody.trim(),
      variant: this.formVariant,
      icon: this.formIcon,
      priority: this.formPriority,
      linkUrl: this.formLinkUrl.trim() || null,
      linkLabel: this.formLinkLabel.trim() || null,
      startsAt: this.formStartsAt ? new Date(this.formStartsAt).toISOString() : null,
      endsAt: this.formEndsAt ? new Date(this.formEndsAt).toISOString() : null,
      dismissible: this.formDismissible,
      ...(status ? { status } : {}),
    };
  }

  submitForm(status: 'DRAFT' | 'SCHEDULED'): void {
    if (!this.canSubmitForm()) {
      return;
    }

    if (status === 'SCHEDULED' && !this.formStartsAt) {
      this.actionOk.set(false);
      this.actionMessage.set('Informe a data de início para agendar.');
      return;
    }

    const payload = this.buildPayload(status);
    const accountId = this.selectedAccountId;
    const editingId = this.editingId();

    this.saving.set(true);
    this.actionMessage.set('');

    const request = editingId
      ? this.noticesApi.update(accountId, editingId, payload)
      : this.noticesApi.create(accountId, payload);

    request.subscribe({
      next: (res) => {
        if (editingId) {
          this.notices.update((list) =>
            list.map((n) => (n.id === res.notice.id ? res.notice : n)),
          );
        } else {
          this.notices.update((list) => [res.notice, ...list]);
        }
        this.cancelForm();
        this.actionOk.set(true);
        this.actionMessage.set(
          status === 'SCHEDULED'
            ? 'Aviso agendado.'
            : editingId
              ? 'Aviso atualizado.'
              : 'Rascunho salvo.',
        );
        this.saving.set(false);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(friendlyPlatformApiError(err, 'Falha ao salvar aviso do campus.'));
        this.saving.set(false);
      },
    });
  }

  openConfirm(notice: CampusNoticeRecord, action: PendingAction['action']): void {
    this.pendingAction.set({ notice, action });
    this.actionMessage.set('');

    if (action === 'publish') {
      this.confirmTitle.set('Publicar aviso');
      this.confirmMessage.set(`Publicar "${notice.title}" para os alunos desta conta?`);
    } else if (action === 'end') {
      this.confirmTitle.set('Encerrar aviso');
      this.confirmMessage.set(`Encerrar "${notice.title}"? Ele deixará de ser exibido.`);
    } else if (action === 'delete') {
      this.confirmTitle.set('Excluir aviso');
      this.confirmMessage.set(`Excluir o rascunho "${notice.title}"? Esta ação não pode ser desfeita.`);
    } else {
      this.confirmTitle.set('Cancelar aviso');
      this.confirmMessage.set(`Cancelar "${notice.title}"? Esta ação não pode ser desfeita.`);
    }

    this.confirmOpen.set(true);
  }

  closeConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingAction.set(null);
  }

  submitAction(): void {
    const pending = this.pendingAction();
    if (!pending || !this.selectedAccountId) {
      return;
    }

    this.confirmOpen.set(false);
    this.acting.set(true);
    this.actionMessage.set('');

    const { notice, action } = pending;
    const accountId = this.selectedAccountId;

    if (action === 'delete') {
      this.noticesApi.delete(accountId, notice.id).subscribe({
        next: () => {
          this.notices.update((list) => list.filter((n) => n.id !== notice.id));
          this.actionOk.set(true);
          this.actionMessage.set('Aviso excluído.');
          this.acting.set(false);
          this.pendingAction.set(null);
        },
        error: (err) => {
          this.actionOk.set(false);
          this.actionMessage.set(friendlyPlatformApiError(err, 'Falha ao atualizar aviso.'));
          this.acting.set(false);
          this.pendingAction.set(null);
        },
      });
      return;
    }

    const request =
      action === 'publish'
        ? this.noticesApi.publish(accountId, notice.id)
        : action === 'end'
          ? this.noticesApi.end(accountId, notice.id)
          : this.noticesApi.cancel(accountId, notice.id);

    request.subscribe({
      next: (res) => {
        this.notices.update((list) => list.map((n) => (n.id === res.notice.id ? res.notice : n)));
        this.actionOk.set(true);
        this.actionMessage.set(
          action === 'publish'
            ? 'Aviso publicado.'
            : action === 'end'
              ? 'Aviso encerrado.'
              : 'Aviso cancelado.',
        );
        this.acting.set(false);
        this.pendingAction.set(null);
      },
      error: (err) => {
        this.actionOk.set(false);
        this.actionMessage.set(friendlyPlatformApiError(err, 'Falha ao atualizar aviso.'));
        this.acting.set(false);
        this.pendingAction.set(null);
      },
    });
  }

  private loadAccounts(): void {
    this.accountsApi.list().subscribe({
      next: (res) => {
        this.accounts.set(res.accounts ?? []);
        if (this.selectedAccountId) {
          this.reloadNotices();
        }
      },
      error: (err) => {
        this.accountsError.set(friendlyPlatformApiError(err, 'Falha ao carregar contas.'));
      },
    });
  }

  reloadNotices(): void {
    if (!this.selectedAccountId) {
      this.notices.set([]);
      return;
    }

    this.loading.set(true);
    this.loadError.set('');

    this.noticesApi
      .list(this.selectedAccountId, {
        status: (this.filterStatus as CampusNoticeStatus) || undefined,
      })
      .subscribe({
        next: (res) => {
          this.notices.set(res.notices ?? []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar avisos do campus.'));
          this.loading.set(false);
        },
      });
  }
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
