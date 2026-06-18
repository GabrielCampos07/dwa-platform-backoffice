import { Component, inject, OnInit, signal } from '@angular/core';
import { friendlyPlatformApiError } from '../../core/api/api-error.util';
import {
  FALLBACK_PRODUCTS,
  ProductCapability,
  ProductRecord,
  ProductsApiService,
} from '../../core/api/products-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-products-page',
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      title="Produtos"
      description="Produtos da plataforma e capacidades habilitadas por produto."
    />

    @if (loadError()) {
      <p class="banner banner--error">{{ loadError() }}</p>
    }

    @if (loading()) {
      <p class="muted">Carregando produtos…</p>
    } @else {
      <div class="products-grid">
        @for (product of products(); track product.id) {
          <article class="product-card">
            <header class="product-card__header">
              <h2>{{ product.name }}</h2>
              <code>{{ product.id }}</code>
              @if (product.isActive === false) {
                <span class="badge badge--off">Inativo</span>
              } @else {
                <span class="badge badge--ok">Ativo</span>
              }
            </header>

            @if (product.description) {
              <p class="product-card__desc">{{ product.description }}</p>
            }

            <section class="capabilities">
              <h3>Capacidades</h3>
              @if (capabilitiesLoading()[product.id]) {
                <p class="muted">Carregando…</p>
              } @else if (capabilitiesError()[product.id]) {
                <p class="muted error">{{ capabilitiesError()[product.id] }}</p>
              } @else if (!capabilities()[product.id]?.length) {
                <p class="muted">Nenhuma capacidade registrada.</p>
              } @else {
                <ul class="cap-list">
                  @for (cap of capabilities()[product.id]; track cap.key) {
                    <li [class.cap--disabled]="cap.enabled === false">
                      <span class="cap-key">{{ cap.label ?? cap.key }}</span>
                      @if (cap.description) {
                        <span class="cap-desc">{{ cap.description }}</span>
                      }
                      @if (cap.enabled === false) {
                        <span class="cap-state">Desabilitada</span>
                      }
                    </li>
                  }
                </ul>
              }
            </section>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .products-grid {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }

    .product-card {
      padding: 1.25rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid #333;
      border-radius: var(--dwa-radius-lg);
    }

    .product-card__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .product-card__header h2 {
      margin: 0;
      font-size: 1.125rem;
      flex: 1;
    }

    .product-card__header code {
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
    }

    .product-card__desc {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--dwa-text-muted);
      line-height: 1.5;
    }

    .capabilities h3 {
      margin: 0 0 0.75rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--dwa-text-muted);
    }

    .cap-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }

    .cap-list li {
      padding: 0.625rem 0.75rem;
      background: var(--dwa-bg-muted);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--dwa-radius-md);
    }

    .cap-list li.cap--disabled {
      opacity: 0.65;
    }

    .cap-key {
      display: block;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .cap-desc {
      display: block;
      margin-top: 0.125rem;
      font-size: 0.75rem;
      color: var(--dwa-text-muted);
    }

    .cap-state {
      display: inline-block;
      margin-top: 0.375rem;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--dwa-danger);
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge--ok {
      background: rgba(82, 224, 160, 0.1);
      color: var(--dwa-success);
    }

    .badge--off {
      background: rgba(163, 163, 163, 0.1);
      color: var(--dwa-text-muted);
    }

    .muted {
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
    }

    .muted.error {
      color: var(--dwa-danger);
    }

    .banner {
      padding: 0.75rem 1rem;
      border-radius: var(--dwa-radius-md);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .banner--error {
      background: rgba(248, 113, 113, 0.12);
      color: var(--dwa-danger);
    }
  `,
})
export class ProductsPageComponent implements OnInit {
  private readonly api = inject(ProductsApiService);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly products = signal<ProductRecord[]>([]);
  readonly capabilities = signal<Record<string, ProductCapability[]>>({});
  readonly capabilitiesLoading = signal<Record<string, boolean>>({});
  readonly capabilitiesError = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (res) => {
        const list = res.products?.length ? res.products : FALLBACK_PRODUCTS;
        this.products.set(list);
        this.loading.set(false);
        for (const product of list) {
          this.loadCapabilities(product.id);
        }
      },
      error: (err) => {
        this.products.set(FALLBACK_PRODUCTS);
        this.loadError.set(friendlyPlatformApiError(err, 'Falha ao carregar produtos.'));
        this.loading.set(false);
        for (const product of FALLBACK_PRODUCTS) {
          this.loadCapabilities(product.id);
        }
      },
    });
  }

  private loadCapabilities(productId: string): void {
    this.capabilitiesLoading.update((m) => ({ ...m, [productId]: true }));

    this.api.getCapabilities(productId).subscribe({
      next: (res) => {
        this.capabilities.update((m) => ({ ...m, [productId]: res.capabilities ?? [] }));
        this.capabilitiesLoading.update((m) => ({ ...m, [productId]: false }));
      },
      error: (err) => {
        this.capabilitiesError.update((m) => ({
          ...m,
          [productId]: friendlyPlatformApiError(err, 'Capacidades indisponíveis.'),
        }));
        this.capabilitiesLoading.update((m) => ({ ...m, [productId]: false }));
      },
    });
  }
}
