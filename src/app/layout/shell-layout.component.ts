import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { HealthApiService } from '../core/api/health-api.service';
import { RealtimeService } from '../core/realtime/realtime.service';
import { ScopePickerComponent } from '../shared/components/scope-picker/scope-picker.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ScopePickerComponent],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand__mark material-symbols-outlined" aria-hidden="true">bolt</span>
          <span class="brand__title">{{ appTitle }}</span>
        </div>
        <nav class="nav">
          <span class="nav__group">Gestão</span>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="material-symbols-outlined" aria-hidden="true">space_dashboard</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/labels" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">label</span>
            <span>Labels</span>
          </a>
          <a routerLink="/feature-flags" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">toggle_on</span>
            <span>Flags de recurso</span>
          </a>
          <a routerLink="/products" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">category</span>
            <span>Produtos</span>
          </a>

          <span class="nav__group">Conteúdo</span>
          <a routerLink="/developer-announcements" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">developer_mode</span>
            <span>Avisos de desenvolvedor</span>
          </a>
          <a routerLink="/campus-notices" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">campaign</span>
            <span>Avisos do campus</span>
          </a>
          <a routerLink="/feed-moderation" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">shield</span>
            <span>Moderação do feed</span>
          </a>

          <span class="nav__group">Contas</span>
          <a routerLink="/accounts" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">corporate_fare</span>
            <span>Contas</span>
          </a>
          <a routerLink="/users" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">group</span>
            <span>Usuários</span>
          </a>
          <a routerLink="/identity-review" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">verified_user</span>
            <span>Revisão de identidade</span>
          </a>

          <span class="nav__group">Privacidade</span>
          <a routerLink="/privacy/deletion-requests" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">delete_forever</span>
            <span>Fila LGPD</span>
          </a>
          <a routerLink="/audit-logs" routerLinkActive="active">
            <span class="material-symbols-outlined" aria-hidden="true">history</span>
            <span>Auditoria</span>
          </a>
        </nav>
      </aside>
      <div class="content">
        <header class="topbar">
          <div class="topbar__left">
            <h1 class="topbar__title">{{ appTitle }}</h1>
            <app-scope-picker />
          </div>
          <div class="topbar__right">
            @if (auth.operatorId()) {
              <span class="operator" title="Operador autenticado">
                <span class="material-symbols-outlined" aria-hidden="true">badge</span>
                <code>{{ auth.operatorId() }}</code>
              </span>
            }
            <div class="health" [class.health--ok]="healthOk()" [class.health--error]="healthChecked() && !healthOk()">
              <span class="health__dot" aria-hidden="true"></span>
              <span class="health__label">
                @if (!healthChecked()) {
                  Verificando API…
                } @else if (healthOk()) {
                  API online
                } @else {
                  API indisponível
                }
              </span>
            </div>
            <button type="button" class="topbar__logout" (click)="logout()">
              <span>Sair</span>
              <span class="material-symbols-outlined" aria-hidden="true">logout</span>
            </button>
          </div>
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
      grid-template-columns: 280px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      background: var(--dwa-bg-elevated);
      border-right: 1px solid #333;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      height: 72px;
      padding: 0 1.5rem;
      border-bottom: 1px solid #333;
    }

    .brand__mark {
      font-size: 1.75rem;
      color: var(--dwa-gold-primary);
      font-variation-settings: 'FILL' 1;
    }

    .brand__title {
      font-family: var(--dwa-font-display);
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--dwa-text-primary);
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 1.5rem 1rem 2rem;
    }

    .nav__group {
      padding: 1rem 0.5rem 0.375rem;
      margin: 0;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .nav__group:first-child {
      padding-top: 0;
    }

    .nav a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 1rem;
      border: 1px solid transparent;
      border-radius: var(--dwa-radius-md);
      color: var(--dwa-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease;
    }

    .nav a .material-symbols-outlined {
      font-size: 1.25rem;
    }

    .nav a:hover {
      background: var(--dwa-bg-muted);
      color: var(--dwa-text-primary);
    }

    .nav a.active {
      background: rgba(201, 162, 39, 0.1);
      border-color: rgba(201, 162, 39, 0.28);
      color: var(--dwa-gold-highlight);
    }

    .nav a.active .material-symbols-outlined {
      font-variation-settings: 'FILL' 1;
    }

    .content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-height: 72px;
      padding: 0.75rem 2rem;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #333;
    }

    .topbar__left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      min-width: 0;
      flex: 1;
    }

    .topbar__right {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }

    .operator {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      max-width: 220px;
      padding: 0.375rem 0.625rem;
      border-radius: var(--dwa-radius-md);
      background: rgba(201, 162, 39, 0.08);
      border: 1px solid rgba(201, 162, 39, 0.2);
      font-size: 0.6875rem;
      color: var(--dwa-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .operator code {
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--dwa-gold-highlight);
    }

    .operator .material-symbols-outlined {
      font-size: 1rem;
      flex-shrink: 0;
      color: var(--dwa-gold-primary);
    }

    .topbar__title {
      margin: 0;
      font-family: var(--dwa-font-display);
      font-weight: 800;
      font-size: 1.125rem;
      letter-spacing: -0.01em;
      text-transform: uppercase;
      color: var(--dwa-text-primary);
      white-space: nowrap;
    }

    .health {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
      white-space: nowrap;
    }

    .health__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--dwa-text-muted);
    }

    .health--ok .health__dot {
      background: var(--dwa-success);
      box-shadow: 0 0 0 3px rgba(82, 224, 160, 0.2);
    }

    .health--error .health__dot {
      background: var(--dwa-danger);
      box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.2);
    }

    .health--ok .health__label {
      color: var(--dwa-success);
    }

    .health--error .health__label {
      color: var(--dwa-danger);
    }

    .topbar__logout {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: var(--dwa-radius-md);
      background: transparent;
      color: var(--dwa-danger);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .topbar__logout:hover {
      background: rgba(248, 113, 113, 0.12);
    }

    .topbar__logout .material-symbols-outlined {
      font-size: 1rem;
    }

    .main {
      padding: 2rem 2.5rem;
      max-width: 1200px;
      width: 100%;
      flex: 1;
    }
  `,
})
export class ShellLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly healthApi = inject(HealthApiService);
  private readonly realtime = inject(RealtimeService);

  readonly appTitle = environment.appTitle;
  readonly healthOk = signal(false);
  readonly healthChecked = signal(false);

  ngOnInit(): void {
    this.checkHealth();
    this.realtime.connect();
  }

  logout(): void {
    this.auth.clear();
    location.href = '/login';
  }

  private checkHealth(): void {
    this.healthApi.check().subscribe({
      next: (res) => {
        this.healthOk.set(res.status?.toLowerCase() === 'ok');
        this.healthChecked.set(true);
      },
      error: () => {
        this.healthOk.set(false);
        this.healthChecked.set(true);
      },
    });
  }
}
