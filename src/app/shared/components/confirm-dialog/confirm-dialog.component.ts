import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirm-dialog',
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="cancel()" role="presentation">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="dialogId"
          (click)="$event.stopPropagation()"
        >
          <h2 [id]="dialogId">{{ title() }}</h2>
          <p>{{ message() }}</p>
          @if (showReason()) {
            <label class="reason">
              <span>{{ reasonLabel() }}</span>
              <textarea
                [(ngModel)]="reason"
                [placeholder]="reasonPlaceholder()"
                rows="3"
              ></textarea>
            </label>
          }
          <div class="dialog__actions">
            <button type="button" class="btn-ghost" (click)="cancel()">{{ cancelLabel() }}</button>
            <button type="button" class="btn-primary" (click)="confirm()">{{ confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
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

    .dialog {
      width: min(420px, 100%);
      padding: 1.5rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid #333;
      border-radius: var(--dwa-radius-lg);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .dialog h2 {
      margin: 0 0 0.75rem;
      font-family: var(--dwa-font-display);
      font-size: 1.125rem;
    }

    .dialog p {
      margin: 0 0 1.25rem;
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .reason {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      margin-bottom: 1.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .reason textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      font: inherit;
      font-size: 0.875rem;
      text-transform: none;
      letter-spacing: normal;
      resize: vertical;
    }

    .dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly dialogId = `confirm-dialog-${Math.random().toString(36).slice(2, 9)}`;

  readonly open = input(false);
  readonly title = input('Confirmar');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly showReason = input(false);
  readonly reasonLabel = input('Motivo (opcional)');
  readonly reasonPlaceholder = input('');

  reason = '';

  readonly confirmed = output<void>();
  readonly confirmedWithReason = output<string>();
  readonly cancelled = output<void>();

  confirm(): void {
    if (this.showReason()) {
      this.confirmedWithReason.emit(this.reason.trim());
      this.reason = '';
    } else {
      this.confirmed.emit();
    }
  }

  cancel(): void {
    this.reason = '';
    this.cancelled.emit();
  }
}
