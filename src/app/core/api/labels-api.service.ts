import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { InternalApiService } from './internal-api.service';

export type LabelRecord = {
  id: string;
  tenantId: string;
  productId: string;
  slug: string;
  name: string;
  brandConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LabelsListResponse = { labels: LabelRecord[] };
export type LabelResponse = { label: LabelRecord };

export type CreateLabelBody = {
  tenantId: string;
  productId: string;
  slug: string;
  name: string;
  brandConfig?: Record<string, unknown>;
  isActive?: boolean;
};

export type UpdateLabelBody = {
  name?: string;
  brandConfig?: Record<string, unknown>;
  isActive?: boolean;
};

export type LabelExportResponse = {
  label: LabelRecord;
  featureFlags: unknown;
  meta: { tenantId: string; productId: string; exportedAt: string };
};

@Injectable({ providedIn: 'root' })
export class LabelsApiService {
  private readonly api = inject(InternalApiService);
  private readonly base = '/internal/v1/labels';

  list(filters?: { tenantId?: string; productId?: string }) {
    let params = new HttpParams();
    if (filters?.tenantId?.trim()) {
      params = params.set('tenantId', filters.tenantId.trim());
    }
    if (filters?.productId?.trim()) {
      params = params.set('productId', filters.productId.trim());
    }
    return this.api.get<LabelsListResponse>(this.base, { params });
  }

  getById(id: string) {
    return this.api.get<LabelResponse>(`${this.base}/${id}`);
  }

  create(body: CreateLabelBody) {
    return this.api.post<LabelResponse>(this.base, body);
  }

  update(id: string, body: UpdateLabelBody) {
    return this.api.patch<LabelResponse>(`${this.base}/${id}`, body);
  }

  export(id: string) {
    return this.api.get<LabelExportResponse>(`${this.base}/${id}/export`);
  }
}
