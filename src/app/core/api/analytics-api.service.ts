import { Injectable, inject } from '@angular/core';
import { PlatformApiService } from './platform-api.service';

export type AnalyticsOverviewByProduct = {
  productId: string;
  totalAccounts: number;
  activeAccounts: number;
  totalUsers: number;
  checkIns7d: number;
  feedPosts7d: number;
};

export type AnalyticsOverview = {
  totalAccounts: number;
  activeAccounts: number;
  totalUsers: number;
  checkIns7d: number;
  feedPosts7d: number;
  pendingIdentityReviews: number;
  pendingDeletionRequests?: number;
  liveDeveloperAnnouncements: number;
  byProduct: AnalyticsOverviewByProduct[];
};

export type AnalyticsOverviewResponse = {
  overview: AnalyticsOverview;
};

export type AccountDashboardStats = {
  activeStudents: number;
  checkIns7d: number;
  activeAssignments: number;
  compliancePercent: number;
};

export type AccountStatsResponse = {
  stats: AccountDashboardStats;
};

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly api = inject(PlatformApiService);

  overview() {
    return this.api.get<AnalyticsOverviewResponse>('/analytics/overview');
  }

  accountStats(accountId: string) {
    return this.api.get<AccountStatsResponse>(`/accounts/${accountId}/analytics`);
  }
}
