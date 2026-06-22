import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type CampusNoticeStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type CampusNoticeVariant = 'STANDARD' | 'FESTIVE';
export type CampusNoticeIcon =
  | 'NONE'
  | 'SPARKLE'
  | 'TROPHY'
  | 'CALENDAR'
  | 'TOOLS'
  | 'HEART';

export type CampusNoticeRecord = {
  id: string;
  accountId?: string;
  title: string;
  body: string;
  variant: CampusNoticeVariant;
  icon: CampusNoticeIcon;
  status: CampusNoticeStatus;
  priority: number;
  linkUrl?: string | null;
  linkLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  dismissible: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CampusNoticesListResponse = {
  notices: CampusNoticeRecord[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type CampusNoticeResponse = {
  notice: CampusNoticeRecord;
};

export type CampusNoticeBody = {
  title: string;
  body: string;
  variant?: CampusNoticeVariant;
  icon?: CampusNoticeIcon;
  priority?: number;
  linkUrl?: string | null;
  linkLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  dismissible?: boolean;
  status?: 'DRAFT' | 'SCHEDULED';
};

export type CampusNoticesListFilters = {
  status?: CampusNoticeStatus;
  limit?: number;
  offset?: number;
};

@Injectable({ providedIn: 'root' })
export class CampusNoticesApiService {
  private readonly api = inject(PlatformApiService);

  private base(accountId: string): string {
    return `/accounts/${accountId}/notices`;
  }

  list(accountId: string, filters?: CampusNoticesListFilters) {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.limit != null) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      params = params.set('offset', String(filters.offset));
    }
    return this.api.get<CampusNoticesListResponse>(this.base(accountId), { params });
  }

  getById(accountId: string, noticeId: string) {
    return this.api.get<CampusNoticeResponse>(`${this.base(accountId)}/${noticeId}`);
  }

  create(accountId: string, body: CampusNoticeBody) {
    return this.api.post<CampusNoticeResponse>(this.base(accountId), body);
  }

  update(accountId: string, noticeId: string, body: Partial<CampusNoticeBody>) {
    return this.api.put<CampusNoticeResponse>(`${this.base(accountId)}/${noticeId}`, body);
  }

  delete(accountId: string, noticeId: string) {
    return this.api.delete<void>(`${this.base(accountId)}/${noticeId}`);
  }

  publish(accountId: string, noticeId: string) {
    return this.api.post<CampusNoticeResponse>(`${this.base(accountId)}/${noticeId}/publish`, {});
  }

  end(accountId: string, noticeId: string) {
    return this.api.post<CampusNoticeResponse>(`${this.base(accountId)}/${noticeId}/end`, {});
  }

  cancel(accountId: string, noticeId: string) {
    return this.api.post<CampusNoticeResponse>(`${this.base(accountId)}/${noticeId}/cancel`, {});
  }
}
