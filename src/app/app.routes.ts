import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
     {
          path: '', loadChildren: () => import('./modules/authentication/authentication-module').then(m => m.AuthenticationModule)
     },
     {
          path: 'welcome',
          loadComponent: () => import('./shared/components/welcome-animation/welcome-animation').then(m => m.WelcomeAnimation),
          canActivate: [AuthGuard]
     },
     {
          path: 'goodbye',
          loadComponent: () => import('./shared/components/goodbye-animation/goodbye-animation').then(m => m.GoodbyeAnimation)
     },
     {
          path: 'profile',
          loadComponent: () => import('./views/admin/my-profile/my-profile.component').then(m => m.MyProfileComponent),
          canActivate: [AuthGuard]
     },
     {
          path: 'admin',
          loadComponent: () => import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
          canActivate: [AuthGuard],
          data: { roles: ['ADMIN'] },
          children: [
               {
                    path: 'dashboard',
                    loadComponent: () => import('./views/admin/dashboard/dashboard').then(m => m.Dashboard)
               },
               {
                    path: 'users',
                    loadChildren: () => import('./modules/user-management/user-management-routing-module').then(m => m.UserManagementRoutingModule)
               },
               {
                    path: 'operators',
                    loadChildren: () => import('./modules/operators-management/operators-management-routing-module').then(m => m.OperatorsManagementRoutingModule)
               },
               {
                    path: 'supplies',
                    loadChildren: () => import('./modules/infrastructure/infrastructure-routing-module').then(m => m.InfrastructureRoutingModule)
               },
               {
                    path: 'inventory',
                    loadChildren: () => import('./modules/inventory-purchases/inventory-purchases-routing-module').then(m => m.InventoryPurchasesRoutingModule)
               },
               {
                    path: 'distribution',
                    loadChildren: () => import('./modules/distribution/distribution-routing-module').then(m => m.DistributionRoutingModule)
               },
               {
                    path: 'water-quality',
                    loadChildren: () => import('./modules/water-quality/water-quality-routing-module').then(m => m.WaterQualityRoutingModule)
               },
               {
                    path: 'payments',
                    loadComponent: () => import('./modules/payments-billing/components/payments-admin/payments-admin').then(m => m.PaymentsAdmin)
               },
               {
                    path: 'incidents',
                    loadChildren: () => import('./modules/claims-incidents/claims-incidents-routing-module').then(m => m.ClaimsIncidentsRoutingModule)
               },
               {
                    path: 'reports',
                    loadComponent: () => import('./modules/report-templates/components/admin-reports/admin-reports').then(m => m.AdminReports)
               },
               {
                    path: 'analytics',
                    loadComponent: () => import('./views/admin/analytics/analytics').then(m => m.Analytics)
               },
               {
                    path: 'profile-settings',
                    loadComponent: () => import('./views/admin/profile-settings/profile-settings').then(m => m.ProfileSettings)
               },
               {
                    path: 'my-profile',
                    loadComponent: () => import('./views/admin/my-profile/my-profile.component').then(m => m.MyProfileComponent)
               },
               {
                    path: '',
                    redirectTo: 'dashboard',
                    pathMatch: 'full'
               }
          ]
     },
     {
          path: 'client',
          loadComponent: () => import('./layouts/client-layout/client-layout').then(m => m.ClientLayout),
          canActivate: [AuthGuard],
          data: { roles: ['CLIENT'] },
          children: [
               {
                    path: 'dashboard',
                    loadComponent: () => import('./views/client/dashboard/dashboard').then(m => m.Dashboard)
               },
               {
                    path: 'payments',
                    loadComponent: () => import('./modules/payments-billing/components/payments-client/payments-client').then(m => m.PaymentsClient)
               },
               {
                    path: 'profile',
                    loadComponent: () => import('./views/admin/my-profile/my-profile.component').then(m => m.MyProfileComponent)
               },
               {
                    path: 'bill-history',
                    loadComponent: () => import('./views/client/bill-history/bill-history').then(m => m.BillHistory)
               },
               {
                    path: 'service-requests',
                    loadComponent: () => import('./views/client/service-requests/service-requests').then(m => m.ServiceRequests)
               },
               {
                    path: 'account-settings',
                    loadComponent: () => import('./views/client/account-settings/account-settings').then(m => m.AccountSettings)
               },
               {
                    path: '',
                    redirectTo: 'dashboard',
                    pathMatch: 'full'
               }
          ]
     },
     {
          path: 'super-admin',
          loadComponent: () => import('./layouts/super-admin-layout/super-admin-layout').then(m => m.SuperAdminLayout),
          canActivate: [AuthGuard],
          data: { roles: ['SUPER_ADMIN'] },
          children: [
               {
                    path: 'dashboard',
                    loadComponent: () => import('./views/super-admin/dashboard/dashboard').then(m => m.Dashboard)
               },
               {
                    path: 'organizations',
                    loadChildren: () => import('./modules/organization-management/organization-management-routing-module').then(m => m.OrganizationManagementRoutingModule)
               },
               {
                    path: 'reports',
                    loadComponent: () => import('./modules/report-templates/components/super-admin-reports/super-admin-reports').then(m => m.SuperAdminReports)
               },
               {
                    path: 'settings',
                    loadComponent: () => import('./modules/organization-management/components/system-settings/system-settings').then(m => m.SystemSettings)
               },
               {
                    path: 'global-analytics',
                    loadComponent: () => import('./views/super-admin/global-analytics/global-analytics').then(m => m.GlobalAnalytics)
               },
               {
                    path: 'system-config',
                    loadComponent: () => import('./views/super-admin/system-config/system-config').then(m => m.SystemConfig)
               },
               {
                    path: 'my-profile',
                    loadComponent: () => import('./views/admin/my-profile/my-profile.component').then(m => m.MyProfileComponent)
               },
               {
                    path: 'backup-restore',
                    loadComponent: () => import('./views/super-admin/backup-restore/backup-restore').then(m => m.BackupRestore)
               },
               {
                    path: '',
                    redirectTo: 'dashboard',
                    pathMatch: 'full'
               }
          ]
     },
     {
          path: '**', redirectTo: ''
     }
];
