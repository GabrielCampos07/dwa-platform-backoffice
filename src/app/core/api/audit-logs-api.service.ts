import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type AuditLogSource = 'platform' | 'product' | string;

export type PlatformAuditLogRecord = {
  id: string;
  operatorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: AuditLogSource | null;
  createdAt: string;
};

export type AuditLogsListResponse = {
  logs: PlatformAuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditLogsListFilters = {
  resourceType?: string;
  action?: string;
  operatorId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

@Injectable({ providedIn: 'root' })
export class AuditLogsApiService {
  private readonly api = inject(PlatformApiService);
  private readonly base = '/audit-logs';

  list(filters?: AuditLogsListFilters) {
    let params = new HttpParams();

    if (filters?.resourceType?.trim()) {
      params = params.set('resourceType', filters.resourceType.trim());
    }
    if (filters?.action?.trim()) {
      params = params.set('action', filters.action.trim());
    }
    if (filters?.operatorId?.trim()) {
      params = params.set('operatorId', filters.operatorId.trim());
    }
    if (filters?.fromDate?.trim()) {
      params = params.set('fromDate', filters.fromDate.trim());
    }
    if (filters?.toDate?.trim()) {
      params = params.set('toDate', filters.toDate.trim());
    }
    if (filters?.limit != null) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      params = params.set('offset', String(filters.offset));
    }

    return this.api.get<AuditLogsListResponse>(this.base, { params });
  }
}
