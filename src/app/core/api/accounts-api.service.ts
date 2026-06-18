import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type SerimpetoMetadata = {
  serimpetoSessionId: string | null;
  serimpetoPlanId: string | null;
  serimpetoSegment: string | null;
  serimpetoBilling: string | null;
  serimpetoStripeSubscriptionId: string | null;
};

export type AccountRecord = {
  id: string;
  name: string;
  slug: string;
  productId: string;
  tenantId?: string;
  brandConfig?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  serimpeto?: SerimpetoMetadata;
};

export type AccountPatchBody = {
  name?: string;
  isActive?: boolean;
};

export type AccountsListResponse = {
  accounts: AccountRecord[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type AccountResponse = { account: AccountRecord };

export type AccountsListFilters = {
  productId?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
};

@Injectable({ providedIn: 'root' })
export class AccountsApiService {
  private readonly api = inject(PlatformApiService);
  private readonly base = '/accounts';

  list(filters?: AccountsListFilters) {
    let params = new HttpParams();
    if (filters?.productId?.trim()) {
      params = params.set('productId', filters.productId.trim());
    }
    if (filters?.tenantId?.trim()) {
      params = params.set('tenantId', filters.tenantId.trim());
    }
    if (filters?.limit != null) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      params = params.set('offset', String(filters.offset));
    }
    return this.api.get<AccountsListResponse>(this.base, { params });
  }

  getById(id: string) {
    return this.api.get<AccountResponse>(`${this.base}/${id}`);
  }

  patch(id: string, body: AccountPatchBody) {
    return this.api.patch<AccountResponse>(`${this.base}/${id}`, body);
  }
}
