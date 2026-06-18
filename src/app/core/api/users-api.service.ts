import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type AccountUserRecord = {
  id: string;
  name: string;
  maskedEmail: string;
  role: string;
  isActive: boolean;
};

export type AccountUsersListResponse = {
  users: AccountUserRecord[];
  total: number;
  limit: number;
  offset: number;
};

export type UserResponse = {
  user: AccountUserRecord;
};

export type UserPatchBody = {
  isActive: boolean;
};

export type AccountUsersListFilters = {
  role?: string;
  limit?: number;
  offset?: number;
};

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly api = inject(PlatformApiService);

  listByAccount(accountId: string, filters?: AccountUsersListFilters) {
    let params = new HttpParams();
    if (filters?.role?.trim()) {
      params = params.set('role', filters.role.trim());
    }
    if (filters?.limit != null) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      params = params.set('offset', String(filters.offset));
    }
    return this.api.get<AccountUsersListResponse>(`/accounts/${accountId}/users`, { params });
  }

  getById(id: string) {
    return this.api.get<UserResponse>(`/users/${id}`);
  }

  patch(id: string, body: UserPatchBody) {
    return this.api.patch<UserResponse>(`/users/${id}`, body);
  }
}
