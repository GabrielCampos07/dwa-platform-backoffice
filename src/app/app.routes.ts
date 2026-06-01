import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellLayoutComponent } from './layout/shell-layout.component';
import { BrandConfigStubPageComponent } from './pages/brand-config/brand-config-stub-page.component';
import { CampusNoticesPageComponent } from './pages/campus-notices/campus-notices-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { FeatureFlagsPageComponent } from './pages/feature-flags/feature-flags-page.component';
import { LabelFormPageComponent } from './pages/labels/label-form-page.component';
import { LabelsListPageComponent } from './pages/labels/labels-list-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardPageComponent },
      { path: 'labels', component: LabelsListPageComponent },
      { path: 'labels/new', component: LabelFormPageComponent },
      { path: 'labels/:id', component: LabelFormPageComponent },
      { path: 'feature-flags', component: FeatureFlagsPageComponent },
      { path: 'campus-notices', component: CampusNoticesPageComponent },
      { path: 'brand-config', component: BrandConfigStubPageComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
