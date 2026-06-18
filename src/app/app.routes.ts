import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellLayoutComponent } from './layout/shell-layout.component';
import { CampusNoticesPageComponent } from './pages/campus-notices/campus-notices-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { DeveloperAnnouncementsFormPageComponent } from './pages/developer-announcements/developer-announcements-form-page.component';
import { DeveloperAnnouncementsListPageComponent } from './pages/developer-announcements/developer-announcements-list-page.component';
import { FeatureFlagsPageComponent } from './pages/feature-flags/feature-flags-page.component';
import { FeedModerationPageComponent } from './pages/feed-moderation/feed-moderation-page.component';
import { LabelFormPageComponent } from './pages/labels/label-form-page.component';
import { LabelsListPageComponent } from './pages/labels/labels-list-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { AccountsListPageComponent } from './pages/accounts/accounts-list-page.component';
import { AccountsDetailPageComponent } from './pages/accounts/accounts-detail-page.component';
import { IdentityReviewPageComponent } from './pages/identity-review/identity-review-page.component';
import { UsersListPageComponent } from './pages/users/users-list-page.component';
import { PrivacyDeletionRequestsPageComponent } from './pages/privacy/deletion-requests-page.component';
import { AuditLogsPageComponent } from './pages/audit-logs/audit-logs-page.component';
import { ProductsPageComponent } from './pages/products/products-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardPageComponent },
      { path: 'accounts', component: AccountsListPageComponent },
      { path: 'accounts/:id', component: AccountsDetailPageComponent },
      { path: 'users', component: UsersListPageComponent },
      { path: 'identity-review', component: IdentityReviewPageComponent },
      { path: 'labels', component: LabelsListPageComponent },
      { path: 'labels/new', component: LabelFormPageComponent },
      { path: 'labels/:id', component: LabelFormPageComponent },
      { path: 'feature-flags', component: FeatureFlagsPageComponent },
      { path: 'developer-announcements', component: DeveloperAnnouncementsListPageComponent },
      { path: 'developer-announcements/new', component: DeveloperAnnouncementsFormPageComponent },
      { path: 'developer-announcements/:id', component: DeveloperAnnouncementsFormPageComponent },
      { path: 'campus-notices', component: CampusNoticesPageComponent },
      { path: 'feed-moderation', component: FeedModerationPageComponent },
      { path: 'privacy/deletion-requests', component: PrivacyDeletionRequestsPageComponent },
      { path: 'audit-logs', component: AuditLogsPageComponent },
      { path: 'products', component: ProductsPageComponent },
      { path: 'brand-config', redirectTo: 'labels', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
