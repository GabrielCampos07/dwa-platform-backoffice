import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type DeveloperAnnouncementStatus = 'DRAFT' | 'LIVE' | 'ENDED';
export type DeveloperAnnouncementSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type DeveloperAnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  severity: DeveloperAnnouncementSeverity;
  status: DeveloperAnnouncementStatus;
  publishedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type DeveloperAnnouncementsListResponse = {
  announcements: DeveloperAnnouncementRecord[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type DeveloperAnnouncementResponse = {
  announcement: DeveloperAnnouncementRecord;
};

export type DeveloperAnnouncementBody = {
  title: string;
  body: string;
  severity: DeveloperAnnouncementSeverity;
};

export type DeveloperAnnouncementsListFilters = {
  status?: DeveloperAnnouncementStatus;
  limit?: number;
  offset?: number;
};

@Injectable({ providedIn: 'root' })
export class DeveloperAnnouncementsApiService {
  private readonly api = inject(PlatformApiService);
  private readonly base = '/developer-announcements';

  list(filters?: DeveloperAnnouncementsListFilters) {
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
    return this.api.get<DeveloperAnnouncementsListResponse>(this.base, { params });
  }

  getById(id: string) {
    return this.api.get<DeveloperAnnouncementResponse>(`${this.base}/${id}`);
  }

  create(body: DeveloperAnnouncementBody) {
    return this.api.post<DeveloperAnnouncementResponse>(this.base, body);
  }

  update(id: string, body: DeveloperAnnouncementBody) {
    return this.api.put<DeveloperAnnouncementResponse>(`${this.base}/${id}`, body);
  }

  delete(id: string) {
    return this.api.delete<void>(`${this.base}/${id}`);
  }

  publish(id: string) {
    return this.api.post<DeveloperAnnouncementResponse>(`${this.base}/${id}/publish`, {});
  }

  end(id: string) {
    return this.api.post<DeveloperAnnouncementResponse>(`${this.base}/${id}/end`, {});
  }
}
