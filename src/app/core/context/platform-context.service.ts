import { Injectable, computed, signal } from '@angular/core';
import { SESSION_PRODUCT_ID, SESSION_TENANT_ID } from '../constants';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PlatformContextService {
  readonly tenantId = signal(this.readStored(SESSION_TENANT_ID, environment.tenantId));
  readonly productId = signal(this.readStored(SESSION_PRODUCT_ID, environment.productId));

  readonly scopeLabel = computed(() => {
    const tenant = this.tenantId().trim();
    const product = this.productId().trim();
    if (!tenant && !product) {
      return '— / —';
    }
    return `${tenant || '—'} / ${product || '—'}`;
  });

  hasScope(): boolean {
    return Boolean(this.tenantId().trim() && this.productId().trim());
  }

  setContext(tenantId: string, productId: string): void {
    const tenant = tenantId.trim();
    const product = productId.trim();
    this.persist(SESSION_TENANT_ID, tenant);
    this.persist(SESSION_PRODUCT_ID, product);
    this.tenantId.set(tenant);
    this.productId.set(product);
  }

  private readStored(key: string, fallback: string): string {
    return sessionStorage.getItem(key) ?? fallback ?? '';
  }

  private persist(key: string, value: string): void {
    if (value) {
      sessionStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
    }
  }
}
