import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type ProductRecord = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
};

export type ProductsListResponse = { products: ProductRecord[] };

export type ProductCapability = {
  key: string;
  label?: string;
  description?: string;
  enabled?: boolean;
};

export type ProductCapabilitiesResponse = { capabilities: ProductCapability[] };

/** Used when platform-api /products is not yet available. */
export const FALLBACK_PRODUCTS: ProductRecord[] = [
  { id: 'academia', name: 'Academia' },
  { id: 'personal', name: 'Personal' },
];

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly api = inject(PlatformApiService);
  private readonly base = '/products';

  list() {
    return this.api.get<ProductsListResponse>(this.base);
  }

  getCapabilities(productId: string) {
    const params = new HttpParams().set('productId', productId);
    return this.api.get<ProductCapabilitiesResponse>(`${this.base}/capabilities`, { params });
  }
}
