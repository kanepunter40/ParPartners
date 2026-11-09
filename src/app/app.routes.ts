import { Routes } from '@angular/router';
import { authGuard, joinGuard, onboardedGuard, welcomeGuard } from './core/guards';

export const routes: Routes = [
  { path: 'welcome', canActivate: [welcomeGuard], loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage) },
  { path: 'onboarding', canActivate: [authGuard], loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage) },
  {
    path: 'tabs',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
      { path: 'rounds', loadComponent: () => import('./pages/rounds/rounds.page').then((m) => m.RoundsPage) },
      { path: 'find', loadComponent: () => import('./pages/find/find.page').then((m) => m.FindPage) },
      { path: 'scores', loadComponent: () => import('./pages/scores/scores.page').then((m) => m.ScoresPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  { path: 'friends', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/friends/friends.page').then((m) => m.FriendsPage) },
  { path: 'settings', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage) },
  { path: 'settings/blocked', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/blocked/blocked.page').then((m) => m.BlockedPage) },
  { path: 'legal/:doc', loadComponent: () => import('./pages/legal/legal.page').then((m) => m.LegalPage) },
  { path: 'profile/edit', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/profile-edit/profile-edit.page').then((m) => m.ProfileEditPage) },
  { path: 'create', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/create-round/create-round.page').then((m) => m.CreateRoundPage) },
  { path: 'round/:id', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/round-detail/round-detail.page').then((m) => m.RoundDetailPage) },
  { path: 'scorecard/new', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/scorecard-new/scorecard-new.page').then((m) => m.ScorecardNewPage) },
  { path: 'scorecard/:id', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/scorecard/scorecard.page').then((m) => m.ScorecardPage) },
  { path: 'join/:code', canActivate: [joinGuard], loadComponent: () => import('./pages/join/join.page').then((m) => m.JoinPage) },
  { path: 'notifications', canActivate: [authGuard, onboardedGuard], loadComponent: () => import('./pages/notifications/notifications.page').then((m) => m.NotificationsPage) },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs' }
];
