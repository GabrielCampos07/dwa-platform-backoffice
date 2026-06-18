import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, isValidOperatorId } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  template: `
    <div class="login">
      <div class="card">
        <h1>{{ appTitle }}</h1>
        <p class="subtitle">
          Operações de plataforma — autentique com a chave <code>INTERNAL_API_KEY</code> da API.
        </p>
        <form (ngSubmit)="submit()">
          <label for="apiKey">Internal API key</label>
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            autocomplete="off"
            [(ngModel)]="apiKey"
            placeholder="min. 16 characters"
            required
          />
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <label for="operatorId">Operator ID (opcional)</label>
          <input
            id="operatorId"
            name="operatorId"
            type="text"
            autocomplete="username"
            [(ngModel)]="operatorId"
            placeholder="ex.: ops@empresa.com"
          />
          <p class="field-hint">
            E-mail válido ou identificador com pelo menos 3 caracteres — usado em auditoria
            (<code>X-Platform-Operator-Id</code>).
          </p>
          @if (operatorError()) {
            <p class="error">{{ operatorError() }}</p>
          }
          <button type="submit" class="btn-primary" [disabled]="!apiKey.trim()">Continue</button>
        </form>
        <p class="hint">
          Key is stored in <code>sessionStorage</code> for this tab only. Never commit secrets to
          git.
        </p>
      </div>
    </div>
  `,
  styles: `
    .login {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 2rem;
    }

    .card {
      width: min(420px, 100%);
      padding: 2rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(201, 162, 39, 0.2);
      border-radius: var(--dwa-radius-lg);
    }

    h1 {
      margin: 0 0 0.5rem;
      font-family: var(--dwa-font-display);
      font-size: 1.5rem;
      color: var(--dwa-gold-highlight);
    }

    .subtitle {
      margin: 0 0 1.5rem;
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
    }

    .field-hint {
      margin: -0.25rem 0 0;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
      line-height: 1.45;
    }

    .error {
      margin: 0;
      color: var(--dwa-danger);
      font-size: 0.875rem;
    }

    .hint {
      margin: 1.25rem 0 0;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
      line-height: 1.4;
    }
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly appTitle = environment.appTitle;
  apiKey = this.auth.devKeyHint;
  operatorId = this.auth.getOperatorId();
  readonly error = signal('');
  readonly operatorError = signal('');

  submit(): void {
    const key = this.apiKey.trim();
    if (key.length < 16) {
      this.error.set('API key must be at least 16 characters.');
      return;
    }

    const operator = this.operatorId.trim();
    if (operator && !isValidOperatorId(operator)) {
      this.operatorError.set('Use um e-mail válido ou um identificador com pelo menos 3 caracteres.');
      this.error.set('');
      return;
    }

    this.error.set('');
    this.operatorError.set('');
    this.auth.setApiKey(key);
    this.auth.setOperatorId(this.operatorId);
    void this.router.navigateByUrl('/');
  }
}
