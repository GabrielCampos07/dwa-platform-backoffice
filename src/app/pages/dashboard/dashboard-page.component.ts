import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeatureFlagsApiService } from '../../core/api/feature-flags-api.service';
import { HealthApiService } from '../../core/api/health-api.service';
import { PlatformContextService } from '../../core/context/platform-context.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <h1>Dashboard</h1>
      <p>Conexão com a API e escopo da plataforma selecionado.</p>
    </header>

    <section class="card-grid">
      <article class="card" [class.card--ok]="apiStatus() === 'ok'" [class.card--err]="apiStatus() === 'error'">
        <h2>API health</h2>
        @if (apiStatus() === 'loading') {
          <p>Verificando <code>/health</code>…</p>
        } @else if (apiStatus() === 'ok' && health()) {
          <p class="status-ok">Conectado</p>
          <dl>
            <dt>Versão</dt>
            <dd>{{ health()!.version }}</dd>
            <dt>Timestamp</dt>
            <dd>{{ health()!.timestamp }}</dd>
          </dl>
        } @else {
          <p class="status-err">{{ apiError() }}</p>
          <p class="muted">Inicie a API na porta <code>3000</code> (proxy dev encaminha automaticamente).</p>
        }
      </article>

      <article class="card" [class.card--ok]="flagsStatus() === 'ok'" [class.card--err]="flagsStatus() === 'error'">
        <h2>Internal API</h2>
        @if (!context.hasScope()) {
          <p class="status-warn">Defina tenant e product na barra de contexto.</p>
        } @else if (flagsStatus() === 'loading') {
          <p>Verificando feature flags…</p>
        } @else if (flagsStatus() === 'ok') {
          <p class="status-ok">Autenticado</p>
          <p>{{ flagCount() }} flag(s) para <code>{{ context.scopeLabel() }}</code></p>
          <a routerLink="/feature-flags" class="link">Gerenciar flags →</a>
        } @else {
          <p class="status-err">{{ flagsError() }}</p>
          <p class="muted">
            Confira se <code>INTERNAL_API_KEY</code> na API corresponde à chave informada no login.
          </p>
        }
      </article>

      <article class="card">
        <h2>Escopo selecionado</h2>
        <dl>
          <dt>Tenant</dt>
          <dd><code>{{ context.tenantId() || '—' }}</code></dd>
          <dt>Product</dt>
          <dd><code>{{ context.productId() || '—' }}</code></dd>
        </dl>
        <a routerLink="/labels" class="link">Gerenciar labels →</a>
      </article>
    </section>
  `,
  styles: `
    .page-header h1 {
      margin: 0 0 0.25rem;
      font-family: var(--dwa-font-display);
      font-size: 1.75rem;
    }

    .page-header p {
      margin: 0 0 2rem;
      color: var(--dwa-text-muted);
    }

    .card-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }

    .card {
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--dwa-radius-lg);
    }

    .card--ok {
      border-color: rgba(82, 224, 160, 0.35);
    }

    .card--err {
      border-color: rgba(248, 113, 113, 0.35);
    }

    .card h2 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
    }

    dl {
      margin: 0.75rem 0 0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25rem 1rem;
      font-size: 0.875rem;
    }

    dt {
      color: var(--dwa-text-muted);
    }

    dd {
      margin: 0;
    }

    .status-ok {
      color: var(--dwa-success);
      font-weight: 600;
    }

    .status-err {
      color: var(--dwa-danger);
    }

    .status-warn {
      color: var(--dwa-warning);
      font-weight: 600;
    }

    .muted {
      font-size: 0.8125rem;
      color: var(--dwa-text-muted);
      line-height: 1.45;
    }

    .link {
      display: inline-block;
      margin-top: 0.75rem;
      color: var(--dwa-gold-highlight);
      font-size: 0.875rem;
    }
  `,
})
export class DashboardPageComponent implements OnInit {
  private readonly healthApi = inject(HealthApiService);
  private readonly flagsApi = inject(FeatureFlagsApiService);
  readonly context = inject(PlatformContextService);

  readonly apiStatus = signal<'loading' | 'ok' | 'error'>('loading');
  readonly flagsStatus = signal<'loading' | 'ok' | 'error' | 'skipped'>('loading');
  readonly health = signal<{ version: string; timestamp: string } | null>(null);
  readonly apiError = signal('Não foi possível alcançar a API.');
  readonly flagsError = signal('Verificação da internal API falhou.');
  readonly flagCount = signal(0);

  ngOnInit(): void {
    this.healthApi.check().subscribe({
      next: (res) => {
        this.health.set({ version: res.version, timestamp: res.timestamp });
        this.apiStatus.set('ok');
      },
      error: (err) => {
        this.apiError.set(err?.error?.message ?? 'API inacessível. Está rodando na porta 3000?');
        this.apiStatus.set('error');
      },
    });

    if (!this.context.hasScope()) {
      this.flagsStatus.set('skipped');
      return;
    }

    this.flagsApi.list().subscribe({
      next: (res) => {
        this.flagCount.set(res.flags.length);
        this.flagsStatus.set('ok');
      },
      error: (err) => {
        const msg =
          err?.status === 401
            ? 'Chave de API interna inválida.'
            : err?.status === 503
              ? 'Internal API não configurada no servidor (INTERNAL_API_KEY ausente).'
              : (err?.error?.message ?? 'Endpoint de feature flags falhou.');
        this.flagsError.set(msg);
        this.flagsStatus.set('error');
      },
    });
  }
}
