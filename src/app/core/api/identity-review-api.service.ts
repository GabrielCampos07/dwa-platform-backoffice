import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type IdentityReviewRecord = {
  labelId: string;
  labelName?: string;
  documentType: 'CNPJ' | 'CPF' | string;
  document: string;
  submittedAt?: string;
  tenantId?: string;
  productId?: string;
};

export type IdentityReviewListResponse = {
  reviews: IdentityReviewRecord[];
};

export type IdentityReviewDecision = 'approve' | 'reject';

export type IdentityReviewBody = {
  decision: IdentityReviewDecision;
  reason?: string;
};

export type IdentityReviewResponse = {
  labelId: string;
  decision: IdentityReviewDecision;
};

@Injectable({ providedIn: 'root' })
export class IdentityReviewApiService {
  private readonly api = inject(PlatformApiService);
  private readonly base = '/provision/identity-review';

  listPending() {
    return this.api.get<IdentityReviewListResponse>(this.base);
  }

  submitReview(labelId: string, body: IdentityReviewBody) {
    return this.api.post<IdentityReviewResponse>(`/provision/identity/${labelId}/review`, body);
  }
}
