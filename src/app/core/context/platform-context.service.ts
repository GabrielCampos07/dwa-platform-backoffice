import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  SESSION_LABEL_ID,
  SESSION_LABEL_NAME,
  SESSION_LABEL_SLUG,
  SESSION_PRODUCT_ID,
  SESSION_TENANT_ID,
} from '../constants';
import { environment } from '../../../environments/environment';
import type { AccountRecord } from '../api/accounts-api.service';

function readBrandConfigString(
  brandConfig: Record<string, unknown> | undefined,
  key: 'tenantId' | 'productId',
): string {
  const value = brandConfig?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

@Injectable({ providedIn: 'root' })
export class PlatformContextService {
  private readonly scopeChangedSubject = new Subject<void>();
  readonly scopeChanged$ = this.scopeChangedSubject.asObservable();

  readonly tenantId = signal(this.readStored(SESSION_TENANT_ID, environment.tenantId));
  readonly productId = signal(this.readStored(SESSION_PRODUCT_ID, environment.productId));
  readonly labelId = signal(this.readStored(SESSION_LABEL_ID, ''));
  readonly labelName = signal(this.readStored(SESSION_LABEL_NAME, ''));
  readonly labelSlug = signal(this.readStored(SESSION_LABEL_SLUG, ''));

  readonly scopeLabel = computed(() => {
    const name = this.labelName().trim();
    const product = this.productId().trim();
    if (name && product) {
      return `${name} · ${product}`;
    }
    const tenant = this.tenantId().trim();
    if (tenant && product) {
      return `${tenant} / ${product}`;
    }
    return 'Nenhuma conta selecionada';
  });

  hasScope(): boolean {
    return Boolean(this.tenantId().trim() && this.productId().trim());
  }

  hasValidLabelScope(): boolean {
    return Boolean(this.labelId().trim() && this.tenantId().trim() && this.productId().trim());
  }

  setFromAccount(account: AccountRecord): void {
    const tenant = (
      account.tenantId?.trim() ||
      readBrandConfigString(account.brandConfig, 'tenantId')
    ).trim();
    const product = (
      account.productId?.trim() ||
      readBrandConfigString(account.brandConfig, 'productId')
    ).trim();
    const id = account.id.trim();
    const name = account.name.trim();
    const slug = account.slug.trim();

    this.persist(SESSION_TENANT_ID, tenant);
    this.persist(SESSION_PRODUCT_ID, product);
    this.persist(SESSION_LABEL_ID, id);
    this.persist(SESSION_LABEL_NAME, name);
    this.persist(SESSION_LABEL_SLUG, slug);

    this.tenantId.set(tenant);
    this.productId.set(product);
    this.labelId.set(id);
    this.labelName.set(name);
    this.labelSlug.set(slug);

    this.scopeChangedSubject.next();
  }

  clearScope(): void {
    this.persist(SESSION_TENANT_ID, '');
    this.persist(SESSION_PRODUCT_ID, '');
    this.persist(SESSION_LABEL_ID, '');
    this.persist(SESSION_LABEL_NAME, '');
    this.persist(SESSION_LABEL_SLUG, '');

    this.tenantId.set('');
    this.productId.set('');
    this.labelId.set('');
    this.labelName.set('');
    this.labelSlug.set('');

    this.scopeChangedSubject.next();
  }

  /** @deprecated Use setFromAccount */
  setContext(tenantId: string, productId: string): void {
    const tenant = tenantId.trim();
    const product = productId.trim();
    this.persist(SESSION_TENANT_ID, tenant);
    this.persist(SESSION_PRODUCT_ID, product);
    this.tenantId.set(tenant);
    this.productId.set(product);
    this.scopeChangedSubject.next();
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
