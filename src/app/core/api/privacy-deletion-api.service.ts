import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type DeletionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export type PrivacyDeletionRequestRecord = {
  id: string;
  status: DeletionRequestStatus;
  requestedAt: string;
  processedAt?: string | null;
  accountId?: string;
  accountName?: string;
  maskedUser?: string;
  userId?: string;
  reason?: string | null;
  rejectionReason?: string | null;
};

export type PrivacyDeletionListResponse = {
  requests: PrivacyDeletionRequestRecord[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type PrivacyDeletionApproveResponse = {
  ok: boolean;
};

export type PrivacyDeletionRejectResponse = {
  ok: boolean;
};

export type PrivacyDeletionListFilters = {
  status?: DeletionRequestStatus;
  limit?: number;
  offset?: number;
};

@Injectable({ providedIn: 'root' })
export class PrivacyDeletionApiService {
  private readonly api = inject(PlatformApiService);
  private readonly base = '/privacy/deletion-requests';

  list(filters?: PrivacyDeletionListFilters) {
    let params = new HttpParams();

    if (filters?.status?.trim()) {
      params = params.set('status', filters.status.trim());
    }
    if (filters?.limit != null) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      params = params.set('offset', String(filters.offset));
    }

    return this.api.get<PrivacyDeletionListResponse>(this.base, { params });
  }

  approve(id: string) {
    return this.api.post<PrivacyDeletionApproveResponse>(`${this.base}/${id}/approve`, {});
  }

  reject(id: string, reason: string) {
    return this.api.post<PrivacyDeletionRejectResponse>(`${this.base}/${id}/reject`, { reason });
  }
}
