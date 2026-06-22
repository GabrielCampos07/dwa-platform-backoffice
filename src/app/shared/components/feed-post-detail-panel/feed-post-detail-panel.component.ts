import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FeedPostRecord } from '../../../core/api/feed-moderation-api.service';

@Component({
  selector: 'app-feed-post-detail-panel',
  imports: [DatePipe],
  template: `
    @if (open() && post(); as p) {
      <div class="backdrop" (click)="close.emit()" role="presentation"></div>
      <aside class="panel" role="dialog" aria-labelledby="feed-detail-title">
        <header class="panel__header">
          <h2 id="feed-detail-title">Detalhe da publicação</h2>
          <button type="button" class="panel__close" aria-label="Fechar" (click)="close.emit()">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <div class="panel__body">
          <dl class="meta">
            <div>
              <dt>Autor</dt>
              <dd>{{ p.authorMasked }}</dd>
            </div>
            @if (p.author?.role) {
              <div>
                <dt>Papel</dt>
                <dd>{{ p.author!.role }}</dd>
              </div>
            }
            <div>
              <dt>Conta</dt>
              <dd>{{ p.labelName ?? p.accountName ?? '—' }}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd><code>{{ p.type }}</code></dd>
            </div>
            <div>
              <dt>Publicado em</dt>
              <dd>{{ p.createdAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
            </div>
            @if (p.likeCount !== undefined) {
              <div>
                <dt>Curtidas</dt>
                <dd>{{ p.likeCount }}</dd>
              </div>
            }
          </dl>

          <section class="content">
            <h3>Conteúdo</h3>
            <p class="content__text">{{ displayContent(p) }}</p>
          </section>
        </div>

        <footer class="panel__footer">
          <button type="button" class="btn-danger" (click)="remove.emit()">Remover publicação</button>
          <button type="button" class="btn-ghost" (click)="close.emit()">Fechar</button>
        </footer>
      </aside>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 101;
      display: flex;
      flex-direction: column;
      width: min(480px, 100vw);
      height: 100vh;
      background: var(--dwa-bg-elevated);
      border-left: 1px solid rgba(201, 162, 39, 0.2);
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
    }

    .panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #333;
    }

    .panel__header h2 {
      margin: 0;
      font-family: var(--dwa-font-display);
      font-size: 1.125rem;
    }

    .panel__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: var(--dwa-radius-md);
      background: transparent;
      color: var(--dwa-text-muted);
      cursor: pointer;
    }

    .panel__close:hover {
      background: var(--dwa-bg-muted);
      color: var(--dwa-text-primary);
    }

    .panel__body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .meta {
      display: grid;
      gap: 1rem;
      margin: 0 0 1.5rem;
    }

    .meta dt {
      margin: 0 0 0.25rem;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dwa-text-muted);
    }

    .meta dd {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--dwa-text-primary);
    }

    .content h3 {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dwa-text-muted);
    }

    .content__text {
      margin: 0;
      padding: 1rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--dwa-radius-md);
      font-size: 0.9375rem;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--dwa-text-primary);
    }

    .panel__footer {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid #333;
    }

    .btn-danger {
      padding: 0.5rem 1rem;
      border: 1px solid rgba(248, 113, 113, 0.35);
      border-radius: var(--dwa-radius-md);
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
    }
  `,
})
export class FeedPostDetailPanelComponent {
  readonly open = input(false);
  readonly post = input<FeedPostRecord | null>(null);

  readonly close = output<void>();
  readonly remove = output<void>();

  displayContent(p: FeedPostRecord): string {
    return p.body?.trim() || p.contentPreview || '(sem conteúdo)';
  }
}
