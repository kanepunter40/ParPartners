import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { ProfileService } from './profile.service';

// Note: inject() only works before the first `await` in a guard, so dependencies are grabbed up front.

/** Invite code opened before sign-in or onboarding was finished; picked up again by onboardedGuard. */
const PENDING_INVITE_KEY = 'pp.pendingInvite';
export const pendingInvite = {
  save: (code: string) => localStorage.setItem(PENDING_INVITE_KEY, code),
  take: (): string | null => {
    const code = localStorage.getItem(PENDING_INVITE_KEY);
    localStorage.removeItem(PENDING_INVITE_KEY);
    return code;
  }
};

/** Signed in? Otherwise send to the welcome screen. */
export const authGuard: CanActivateFn = async () => {
  const sb = inject(SupabaseService);
  const router = inject(Router);
  await sb.ready;
  return sb.session() ? true : router.createUrlTree(['/welcome']);
};

/** Signed in but profile not finished? Send to onboarding. */
export const onboardedGuard: CanActivateFn = async () => {
  const sb = inject(SupabaseService);
  const profiles = inject(ProfileService);
  const router = inject(Router);
  // Guards in one canActivate array can run side by side, so check the session here too.
  await sb.ready;
  if (!sb.session()) return router.createUrlTree(['/welcome']);
  const profile = await profiles.load();
  if (!profile?.onboarded) return router.createUrlTree(['/onboarding']);
  const code = pendingInvite.take();
  return code ? router.createUrlTree(['/join', code]) : true;
};

/** Invite links need a finished profile. If not there yet, remember the code and come back after. */
export const joinGuard: CanActivateFn = async (route) => {
  const sb = inject(SupabaseService);
  const profiles = inject(ProfileService);
  const router = inject(Router);
  const code = route.paramMap.get('code')!;
  await sb.ready;
  if (!sb.session()) {
    pendingInvite.save(code);
    return router.createUrlTree(['/welcome']);
  }
  const profile = await profiles.load();
  if (!profile?.onboarded) {
    pendingInvite.save(code);
    return router.createUrlTree(['/onboarding']);
  }
  return true;
};

/** Already signed in? Skip the welcome screen. */
export const welcomeGuard: CanActivateFn = async () => {
  const sb = inject(SupabaseService);
  const router = inject(Router);
  await sb.ready;
  return sb.session() ? router.createUrlTree(['/tabs']) : true;
};
