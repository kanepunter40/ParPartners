import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonSegment, IonSegmentButton, IonLabel, IonSearchbar, IonButton, IonIcon, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, locate } from 'ionicons/icons';
import { RoundsService } from '../../core/rounds.service';
import { NotificationsService } from '../../core/notifications.service';
import { NotificationsBellComponent } from '../../core/notifications-bell.component';
import { LocationService } from '../../core/location.service';
import { ProfileService } from '../../core/profile.service';
import { Course, Position, RoundResult } from '../../core/models';

type Mode = 'near' | 'course';
type When = 'any' | 'this' | 'next';
const RADII = [10, 25, 50, 100];

/** Saturday 00:00 to Monday 00:00 for the weekend `offset` weeks ahead (0 = this one, running from now if already Sat/Sun). */
function weekendRange(offset: number): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const sat = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  sat.setDate(sat.getDate() + (day === 0 ? -1 : 6 - day) + offset * 7);
  const mon = new Date(sat);
  mon.setDate(sat.getDate() + 2);
  const from = offset === 0 && (day === 0 || day === 6) ? now : sat;
  return { from, to: mon };
}

@Component({
  selector: 'app-find',
  imports: [DatePipe, RouterLink, NotificationsBellComponent, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonSegment, IonSegmentButton, IonLabel, IonSearchbar, IonButton, IonIcon, IonFab, IonFabButton],
  styles: [`
    .chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
    .chip { flex-shrink: 0; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; color: #1F3532; font: 600 13px 'Work Sans', sans-serif; }
    .chip.on { background: #2E5F5A; border-color: #2E5F5A; color: #fff; }
    .chip.radius.on { background: #E3ECE9; color: #2E5F5A; }
    .course-opt { display: block; width: 100%; text-align: left; min-height: 48px; padding: 8px 14px; border: 0; border-bottom: 1px solid #EFEAD9; background: #fff; font-family: inherit; color: #1F3532; }
    .result { display: block; text-decoration: none; color: inherit; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-title>Find a round</ion-title><ion-buttons slot="end"><app-notifications-bell /></ion-buttons></ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="mode()" (ionChange)="setMode($event)" style="margin: 0 24px; width: auto">
          <ion-segment-button value="near"><ion-label>Near a location</ion-label></ion-segment-button>
          <ion-segment-button value="course"><ion-label>By course</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-pad" style="display: flex; flex-direction: column; gap: 12px">
        @if (mode() === 'near') {
          <div style="display: flex; align-items: center; gap: 8px">
            <div style="flex: 1">
              <strong>{{ centreLabel() }}</strong>
              <div class="muted" style="font-size: 12px">Rounds within the radius of this point</div>
            </div>
            <ion-button size="small" fill="outline" (click)="useMyLocation()"><ion-icon slot="start" name="locate"></ion-icon>My location</ion-button>
          </div>
          <div class="chips" role="group" aria-label="Radius">
            @for (r of radii; track r) {
              <button type="button" class="chip radius" [class.on]="radius() === r" [attr.aria-pressed]="radius() === r" (click)="setRadius(r)">{{ r }} km</button>
            }
          </div>
        } @else {
          <ion-searchbar placeholder="Search for a course" [value]="course()?.name ?? ''" [debounce]="250" (ionInput)="searchCourse($event)"></ion-searchbar>
          @if (suggestions().length) {
            <div style="border: 1px solid #E6DFC9; border-radius: 12px; overflow: hidden">
              @for (c of suggestions(); track c.id) {
                <button type="button" class="course-opt" (click)="pickCourse(c)"><strong>{{ c.name }}</strong><br><span class="muted" style="font-size: 12px">{{ c.city }}</span></button>
              }
            </div>
          }
        }

        <div class="chips" role="group" aria-label="When">
          @for (w of whens; track w[0]) {
            <button type="button" class="chip" [class.on]="when() === w[0]" [attr.aria-pressed]="when() === w[0]" (click)="setWhen(w[0])">{{ w[1] }}</button>
          }
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px">
          <strong>{{ mode() === 'course' && !course() ? '' : loading() ? 'Searching…' : results().length === 1 ? '1 open round' : results().length + ' open rounds' }}</strong>
          <span class="muted" style="font-size: 12px">{{ areaLabel() }}</span>
        </div>

        @if (error()) { <p role="alert" style="color: #9C5428; margin: 0">{{ error() }}</p> }

        <div>
          @for (r of results(); track r.round_id) {
            <a class="result" [routerLink]="['/round', r.round_id]">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px">
                <span class="pill">{{ r.spots_left }} {{ r.spots_left === 1 ? 'spot' : 'spots' }} left</span>
                @if (r.distance_km !== null) { <span class="muted" style="font-size: 13px">{{ r.distance_km }} km away</span> }
              </div>
              <h3 style="margin: 0 0 6px; font-size: 18px">{{ r.course_name }}</h3>
              <strong style="font-size: 14px">{{ r.tee_time | date: 'EEE d MMM · HH:mm' }}</strong>
              <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #EFEAD9">
                <span class="muted" style="font-size: 13px">{{ r.host_name }}{{ r.host_handicap !== null ? ' · HCP ' + r.host_handicap : '' }}</span>
                <span style="font-size: 13px; font-weight: 600; color: #2E5F5A">View &amp; request</span>
              </div>
            </a>
          }
          @if (mode() === 'course' && !course()) {
            <p class="muted" style="text-align: center; padding: 32px 8px; margin: 0">Search for a course to see its open rounds.</p>
          } @else if (!loading() && !results().length && !error()) {
            <div style="text-align: center; padding: 32px 8px; display: flex; flex-direction: column; align-items: center; gap: 10px">
              <h3 style="margin: 0">No open rounds here yet</h3>
              <p class="muted" style="margin: 0; font-size: 14px">Try a wider radius or another date. Or post your own round and let players find you.</p>
              <ion-button routerLink="/create">Post a round</ion-button>
            </div>
          }
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button routerLink="/create" aria-label="Post a round"><ion-icon name="add"></ion-icon></ion-fab-button>
      </ion-fab>
    </ion-content>
  `
})
export class FindPage {
  private rounds = inject(RoundsService);
  private location = inject(LocationService);
  private profiles = inject(ProfileService);
  private notifications = inject(NotificationsService);

  readonly radii = RADII;
  readonly whens: [When, string][] = [['any', 'Any date'], ['this', 'This weekend'], ['next', 'Next weekend']];

  mode = signal<Mode>('near');
  radius = signal(25);
  when = signal<When>('any');
  centre = signal<Position | null>(null);
  centreName = signal('');
  course = signal<Course | null>(null);
  suggestions = signal<Course[]>([]);
  results = signal<RoundResult[]>([]);
  loading = signal(false);
  error = signal('');

  constructor() {
    addIcons({ add, locate });
  }

  async ionViewWillEnter() {
    this.notifications.refreshUnread();
    if (!this.centre()) await this.setDefaultCentre();
    this.load();
  }

  /** Default search centre: the player's home course, falling back to the device location. */
  private async setDefaultCentre() {
    try {
      const profile = await this.profiles.load();
      if (profile?.home_course_id) {
        const c = await this.rounds.getCourse(profile.home_course_id);
        if (c) {
          this.centre.set({ lat: c.lat, lng: c.lng });
          this.centreName.set('Near ' + c.name);
          return;
        }
      }
      await this.useMyLocation(false);
    } catch { /* leave unset; the user can tap "My location" */ }
  }

  centreLabel() {
    return this.centreName() || 'Choose a location';
  }

  areaLabel() {
    return this.mode() === 'course' ? (this.course()?.name ?? 'Pick a course') : `Within ${this.radius()} km`;
  }

  async useMyLocation(reload = true) {
    try {
      this.centre.set(await this.location.current());
      this.centreName.set('Your location');
      this.error.set('');
      if (reload) this.load();
    } catch {
      this.error.set('Could not get your location. Check the permission, or search by course.');
    }
  }

  setMode(ev: Event) {
    this.mode.set((ev as CustomEvent).detail.value as Mode);
    this.load();
  }
  setRadius(r: number) { this.radius.set(r); this.load(); }
  setWhen(w: When) { this.when.set(w); this.load(); }

  async searchCourse(ev: Event) {
    const q = (ev as CustomEvent).detail?.value ?? '';
    if (q.length < 2 || q === this.course()?.name) { this.suggestions.set([]); return; }
    this.suggestions.set(await this.rounds.searchCourses(q, this.centre()));
  }

  pickCourse(c: Course) {
    this.course.set(c);
    this.suggestions.set([]);
    this.load();
  }

  async load() {
    const range = this.when() === 'this' ? weekendRange(0) : this.when() === 'next' ? weekendRange(1) : null;
    const byCourse = this.mode() === 'course';
    if (byCourse && !this.course()) { this.results.set([]); return; }
    if (!byCourse && !this.centre()) { this.results.set([]); return; }

    this.loading.set(true);
    this.error.set('');
    try {
      this.results.set(
        await this.rounds.findRounds({
          lat: byCourse ? this.course()!.lat : this.centre()!.lat,
          lng: byCourse ? this.course()!.lng : this.centre()!.lng,
          radiusKm: byCourse ? 1 : this.radius(),
          courseId: byCourse ? this.course()!.id : null,
          from: range?.from ?? null,
          to: range?.to ?? null
        })
      );
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not load rounds.');
    } finally {
      this.loading.set(false);
    }
  }
}
