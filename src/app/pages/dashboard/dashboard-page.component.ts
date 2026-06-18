import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  AnalyticsApiService,
  AnalyticsOverview,
} from '../../core/api/analytics-api.service';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  FALLBACK_PRODUCTS,
  ProductRecord,
  ProductsApiService,
} from '../../core/api/products-api.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type MetricCard = {
  key: string;
  label: string;
  value: number;
  link?: string;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, DecimalPipe, PageHeaderComponent],
  template: `
    <app-page-header
      title="Dashboard"
      description="Métricas agregadas da plataforma — atualização em tempo real quando disponível."
    >
      <div actions class="live-status">
        <span
          class="live-dot"
          [class.live-dot--on]="realtime.connected()"
          aria-hidden="true"
        ></span>
        <span class="live-label">
          @if (realtime.connected()) {
            Tempo real ativo
          } @else {
            Tempo real indisponível
          }
        </span>
      </div>
    </app-page-header>

    @if (realtime.lastToast(); as toast) {
      <div class="toast" role="status">
        <span>{{ toast }}</span>
        <button type="button" class="toast__dismiss" (click)="realtime.dismissToast()">Fechar</button>
      </div>
    }

    @if (status() === 'loading') {
      <p class="muted">Carregando métricas da plataforma…</p>
    } @else if (status() === 'error') {
      <p class="banner banner--error">{{ loadError() }}</p>
      <p class="muted">
        Inicie a <strong>platform-api</strong> na porta <code>3010</code> ou aguarde o deploy do
        endpoint <code>/platform/v1/analytics/overview</code>.
      </p>
    } @else if (overview(); as data) {
      <section class="metric-grid" aria-label="Métricas da plataforma">
        @for (card of metricCards(data); track card.key) {
          @if (card.link) {
            <a class="metric-card metric-card--link" [routerLink]="card.link">
              <span class="metric-card__label">{{ card.label }}</span>
              <span class="metric-card__value">{{ card.value | number }}</span>
            </a>
          } @else {
            <article class="metric-card">
              <span class="metric-card__label">{{ card.label }}</span>
              <span class="metric-card__value">{{ card.value | number }}</span>
            </article>
          }
        }
      </section>

      @if (data.byProduct.length) {
        <section class="breakdown">
          <h2>Por produto</h2>
          <div class="breakdown-grid">
            @for (row of data.byProduct; track row.productId) {
              <article class="breakdown-card">
                <h3>{{ productLabel(row.productId) }}</h3>
                <dl>
                  <div>
                    <dt>Contas</dt>
                    <dd>{{ row.totalAccounts | number }}</dd>
                  </div>
                  <div>
                    <dt>Ativas</dt>
                    <dd>{{ row.activeAccounts | number }}</dd>
                  </div>
                  <div>
                    <dt>Usuários</dt>
                    <dd>{{ row.totalUsers | number }}</dd>
                  </div>
                  <div>
                    <dt>Check-ins 7d</dt>
                    <dd>{{ row.checkIns7d | number }}</dd>
                  </div>
                  <div>
                    <dt>Posts feed 7d</dt>
                    <dd>{{ row.feedPosts7d | number }}</dd>
                  </div>
                </dl>
              </article>
            }
          </div>
        </section>
      }
    }
  `,
  styles: `
    .live-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
      white-space: nowrap;
    }

    .live-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--dwa-text-muted);
    }

    .live-dot--on {
      background: var(--dwa-success);
      box-shadow: 0 0 0 3px rgba(82, 224, 160, 0.2);
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      padding: 0.75rem 1rem;
      background: rgba(201, 162, 39, 0.12);
      border: 1px solid rgba(201, 162, 39, 0.25);
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      color: var(--dwa-gold-highlight);
    }

    .toast__dismiss {
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .metric-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      margin-bottom: 2rem;
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--dwa-radius-lg);
      text-decoration: none;
      color: inherit;
    }

    .metric-card--link:hover {
      border-color: rgba(201, 162, 39, 0.35);
    }

    .metric-card__label {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .metric-card__value {
      font-family: var(--dwa-font-display);
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.1;
    }

    .breakdown h2 {
      margin: 0 0 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .breakdown-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }

    .breakdown-card {
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid #333;
      border-radius: var(--dwa-radius-lg);
    }

    .breakdown-card h3 {
      margin: 0 0 1rem;
      font-size: 1rem;
    }

    .breakdown-card dl {
      display: grid;
      gap: 0.625rem;
      margin: 0;
    }

    .breakdown-card dt {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .breakdown-card dd {
      margin: 0.125rem 0 0;
      font-size: 1.125rem;
      font-weight: 700;
    }

    .muted {
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      margin: 0 0 0.75rem;
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }
  `,
})
export class DashboardPageComponent implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly realtime = inject(RealtimeService);

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly loadError = signal('');
  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly products = signal<ProductRecord[]>(FALLBACK_PRODUCTS);

  ngOnInit(): void {
    this.loadProducts();
    this.reloadOverview();
    this.realtime.connect();
    this.realtime.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.type === 'stats_updated') {
        this.reloadOverview(true);
      }
    });
  }

  metricCards(data: AnalyticsOverview): MetricCard[] {
    return [
      {
        key: 'activeAccounts',
        label: 'Contas ativas',
        value: data.activeAccounts,
        link: '/accounts',
      },
      { key: 'totalUsers', label: 'Usuários', value: data.totalUsers, link: '/accounts' },
      { key: 'checkIns7d', label: 'Check-ins 7d', value: data.checkIns7d },
      {
        key: 'feedPosts7d',
        label: 'Posts feed 7d',
        value: data.feedPosts7d,
        link: '/feed-moderation',
      },
      {
        key: 'pendingIdentityReviews',
        label: 'Revisões pendentes',
        value: data.pendingIdentityReviews,
        link: '/identity-review',
      },
      {
        key: 'pendingDeletionRequests',
        label: 'Pedidos LGPD pendentes',
        value: data.pendingDeletionRequests ?? 0,
        link: '/privacy/deletion-requests',
      },
      {
        key: 'liveDeveloperAnnouncements',
        label: 'Avisos dev ativos',
        value: data.liveDeveloperAnnouncements,
        link: '/developer-announcements',
      },
    ];
  }

  productLabel(productId: string): string {
    const match = this.products().find((p) => p.id === productId);
    return match?.name ?? productId;
  }

  private loadProducts(): void {
    this.productsApi.list().subscribe({
      next: (res) => {
        if (res.products?.length) {
          this.products.set(res.products);
        }
      },
      error: () => {
        this.products.set(FALLBACK_PRODUCTS);
      },
    });
  }

  private reloadOverview(silent = false): void {
    if (!silent) {
      this.status.set('loading');
      this.loadError.set('');
    }

    this.analyticsApi.overview().subscribe({
      next: (res) => {
        this.overview.set(res.overview);
        this.status.set('ok');
      },
      error: (err) => {
        if (!silent) {
          this.overview.set(null);
          this.loadError.set(
            friendlyPlatformApiError(err, 'Não foi possível carregar o resumo analítico.'),
          );
          this.status.set('error');
        }
      },
    });
  }
}
