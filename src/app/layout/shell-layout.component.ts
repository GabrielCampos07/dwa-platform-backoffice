import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { PlatformContextService } from '../core/context/platform-context.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand__title">{{ appTitle }}</span>
          <span class="brand__subtitle">Internal ops</span>
        </div>
        <nav class="nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Dashboard
          </a>
          <a routerLink="/labels" routerLinkActive="active">Labels</a>
          <a routerLink="/feature-flags" routerLinkActive="active">Feature flags</a>
          <a routerLink="/campus-notices" routerLinkActive="active">Campus notices</a>
          <a routerLink="/brand-config" routerLinkActive="active">Brand config</a>
        </nav>
        <button type="button" class="btn-ghost logout" (click)="logout()">Sair</button>
      </aside>
      <div class="content">
        <header class="context-bar">
          <div class="context-bar__fields">
            <label>
              <span>Tenant ID</span>
              <input type="text" [(ngModel)]="draftTenant" placeholder="ex.: dwa" />
            </label>
            <label>
              <span>Product ID</span>
              <input type="text" [(ngModel)]="draftProduct" placeholder="ex.: academia" />
            </label>
            <button type="button" class="btn-primary btn-sm" (click)="applyContext()">Aplicar escopo</button>
          </div>
          <p class="context-bar__hint">
            Escopo atual: <code>{{ context.scopeLabel() }}</code> — persiste em
            <code>sessionStorage</code>
          </p>
        </header>
        <main class="main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem 1rem;
      background: var(--dwa-bg-elevated);
      border-right: 1px solid rgba(201, 162, 39, 0.15);
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .brand__title {
      font-family: var(--dwa-font-display);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--dwa-gold-highlight);
      font-size: 1.125rem;
    }

    .brand__subtitle {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dwa-text-muted);
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .nav a {
      padding: 0.625rem 0.75rem;
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-primary);
      text-decoration: none;
      font-size: 0.875rem;
      transition: background 0.15s ease;
    }

    .nav a:hover {
      background: var(--dwa-bg-muted);
    }

    .nav a.active {
      background: rgba(201, 162, 39, 0.12);
      color: var(--dwa-gold-highlight);
    }

    .logout {
      margin-top: auto;
      align-self: flex-start;
    }

    .content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .context-bar {
      padding: 1rem 2rem;
      background: var(--dwa-bg-muted);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .context-bar__fields {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
    }

    .context-bar__fields label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--dwa-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .context-bar__fields input {
      width: 160px;
    }

    .btn-sm {
      padding: 0.5rem 0.875rem;
      font-size: 0.8125rem;
    }

    .context-bar__hint {
      margin: 0.5rem 0 0;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
    }

    .main {
      padding: 2rem;
      max-width: 960px;
      flex: 1;
    }
  `,
})
export class ShellLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly context = inject(PlatformContextService);

  readonly appTitle = environment.appTitle;

  draftTenant = this.context.tenantId();
  draftProduct = this.context.productId();

  applyContext(): void {
    this.context.setContext(this.draftTenant, this.draftProduct);
    location.reload();
  }

  logout(): void {
    this.auth.clear();
    location.href = '/login';
  }
}
