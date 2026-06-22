import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_LABELS,
  type FeatureFlagKey,
} from '../constants';
import { PlatformContextService } from '../context/platform-context.service';
import { InternalApiService } from './internal-api.service';
import { PlatformApiService } from './platform-api.service';
import { ProductsApiService } from './products-api.service';

export type FeatureFlagRecord = {
  key: string;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
  version: number;
};

export type FeatureFlagsResponse = {
  tenantId: string;
  productId: string;
  flags: FeatureFlagRecord[];
};

export type FeatureFlagKeyDefinition = {
  key: string;
  label: string;
  defaultEnabled?: boolean;
};

export type FeatureFlagKeysApiResponse = {
  keys?: (string | FeatureFlagKeyDefinition)[];
};

export type FeatureFlagKeysResult = {
  keys: string[];
  definitions: FeatureFlagKeyDefinition[];
  source: 'api' | 'capabilities' | 'constants';
};

@Injectable({ providedIn: 'root' })
export class FeatureFlagsApiService {
  private readonly platformApi = inject(PlatformApiService);
  private readonly internalApi = inject(InternalApiService);
  private readonly productsApi = inject(ProductsApiService);
  private readonly context = inject(PlatformContextService);

  private platformBasePath(tenantId?: string, productId?: string): string {
    const tenant = (tenantId ?? this.context.tenantId()).trim();
    const product = (productId ?? this.context.productId()).trim();
    return `/tenants/${tenant}/products/${product}/feature-flags`;
  }

  private internalBasePath(tenantId?: string, productId?: string): string {
    const tenant = (tenantId ?? this.context.tenantId()).trim();
    const product = (productId ?? this.context.productId()).trim();
    return `/internal/v1/tenants/${tenant}/products/${product}/feature-flags`;
  }

  list(tenantId?: string, productId?: string) {
    return this.platformApi
      .get<FeatureFlagsResponse>(this.platformBasePath(tenantId, productId))
      .pipe(catchError(() => this.internalApi.get<FeatureFlagsResponse>(this.internalBasePath(tenantId, productId))));
  }

  upsert(
    flags: { key: string; enabled: boolean; metadata?: Record<string, unknown> | null }[],
    tenantId?: string,
    productId?: string,
  ) {
    const body = { flags };
    return this.platformApi
      .put<FeatureFlagsResponse>(this.platformBasePath(tenantId, productId), body)
      .pipe(catchError(() => this.internalApi.put<FeatureFlagsResponse>(this.internalBasePath(tenantId, productId), body)));
  }

  /** Resolves flag keys from platform-api, capabilities, or static constants. */
  resolveFlagKeys(productId?: string): Observable<FeatureFlagKeysResult> {
    const product = (productId ?? this.context.productId()).trim();
    if (!product) {
      return of(normalizeFlagDefinitions([...FEATURE_FLAG_KEYS], 'constants'));
    }

    return this.platformApi
      .get<FeatureFlagKeysApiResponse>(`/products/${product}/feature-flag-keys`)
      .pipe(
        map((res) => normalizeFlagDefinitions(res.keys, 'api')),
        catchError(() =>
          this.productsApi.getCapabilities(product).pipe(
            map((res) => {
              const keys = res.capabilities?.map((c) => c.key).filter(Boolean) ?? [];
              return normalizeFlagDefinitions(keys.length ? keys : [...FEATURE_FLAG_KEYS], keys.length ? 'capabilities' : 'constants');
            }),
            catchError(() => of(normalizeFlagDefinitions([...FEATURE_FLAG_KEYS], 'constants'))),
          ),
        ),
      );
  }
}

function normalizeFlagDefinitions(
  raw: (string | FeatureFlagKeyDefinition)[] | undefined,
  source: FeatureFlagKeysResult['source'],
): FeatureFlagKeysResult {
  const definitions: FeatureFlagKeyDefinition[] = (raw ?? []).map((item) => {
    if (typeof item === 'string') {
      return { key: item, label: labelForFlagKey(item) };
    }
    return {
      key: item.key,
      label: item.label || labelForFlagKey(item.key),
      defaultEnabled: item.defaultEnabled,
    };
  });

  const keys = definitions.map((d) => d.key);

  if (!keys.length) {
    const fallback = [...FEATURE_FLAG_KEYS].map((key) => ({
      key,
      label: FEATURE_FLAG_LABELS[key],
    }));
    return { keys: [...FEATURE_FLAG_KEYS], definitions: fallback, source: 'constants' };
  }

  return { keys, definitions, source };
}

/** Best-effort label for a flag key — known keys use constants, others are title-cased. */
export function labelForFlagKey(key: string, definitions?: Map<string, string>): string {
  const fromApi = definitions?.get(key);
  if (fromApi) {
    return fromApi;
  }
  if ((FEATURE_FLAG_KEYS as readonly string[]).includes(key)) {
    return FEATURE_FLAG_LABELS[key as FeatureFlagKey];
  }
  return key.replace(/[-_]/g, ' ');
}
