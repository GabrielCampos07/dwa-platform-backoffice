import { Injectable, inject } from '@angular/core';
import type { FeatureFlagKey } from '../constants';
import { PlatformContextService } from '../context/platform-context.service';
import { InternalApiService } from './internal-api.service';

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

@Injectable({ providedIn: 'root' })
export class FeatureFlagsApiService {
  private readonly api = inject(InternalApiService);
  private readonly context = inject(PlatformContextService);

  private basePath(tenantId?: string, productId?: string): string {
    const tenant = (tenantId ?? this.context.tenantId()).trim();
    const product = (productId ?? this.context.productId()).trim();
    return `/internal/v1/tenants/${tenant}/products/${product}/feature-flags`;
  }

  list(tenantId?: string, productId?: string) {
    return this.api.get<FeatureFlagsResponse>(this.basePath(tenantId, productId));
  }

  upsert(
    flags: { key: FeatureFlagKey; enabled: boolean; metadata?: Record<string, unknown> | null }[],
    tenantId?: string,
    productId?: string,
  ) {
    return this.api.put<FeatureFlagsResponse>(this.basePath(tenantId, productId), { flags });
  }
}
