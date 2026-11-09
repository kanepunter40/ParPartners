import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonSegment, IonSegmentButton, IonLabel, IonSearchbar, IonButton, IonIcon, IonSelect, IonSelectOption, ActionSheetController } from '@ionic/angular/standalone';
import { ROUND_FORMATS, RoundFormat } from '../../core/round-format';
import { addIcons } from 'ionicons';
import { locate, home, notificationsOutline, checkmark } from 'ionicons/icons';
import { RoundsService } from '../../core/rounds.service';
import { NotificationsService } from '../../core/notifications.service';
import { NotificationsBellComponent } from '../../core/notifications-bell.component';
import { IllustrationComponent } from '../../core/illustration.component';
import { LocationService } from '../../core/location.service';
import { ProfileService } from '../../core/profile.service';
import { Course, FreePlayer, Position, RoundResult, SearchAlert } from '../../core/models';
import { AlertsService } from '../../core/alerts.service';
import { AvailabilityService, isoDay } from '../../core/availability.service';
import { AvatarComponent } from '../../core/avatar.component';

type Mode = 'near' | 'course';
type When = 'any' | 'weekdays' | 'this' | 'next';
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

/** Monday to Friday, in the phone's time zone. */
function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/** centreName value meaning the device location (shown translated). */
const MY_LOCATION = '@me';

@Component({
  selector: 'app-find',
  imports: [RouterLink, AvatarComponent, NotificationsBellComponent, IllustrationComponent, IonContent, IonHeader, IonToolbar, IonButtons, IonSegment, IonSegmentButton, IonLabel, IonSearchbar, IonButton, IonIcon, IonSelect, IonSelectOption],
  styles: [`
    .find { display: flex; flex-direction: column; gap: 28px; }
    .filters { background: #ECE8DA; border-radius: 20px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .where { display: flex; align-items: center; gap: 12px; }
    .group { display: flex; flex-direction: column; gap: 8px; }
    .group-label { font-size: 12px; font-weight: 600; color: #5F5B4E; text-transform: uppercase; letter-spacing: .04em; }
    /* Equal-width chips, so each row fits the panel without scrolling */
    .chips { display: flex; gap: 8px; }
    .chip { flex: 1 1 0; min-width: 0; min-height: 44px; padding: 4px 6px; line-height: 1.15; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; color: #1F3532; font: 600 13px 'Work Sans', sans-serif; }
    .chip.on { background: #2E5F5A; border-color: #2E5F5A; color: #fff; }
    .results-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px; }
    .results-head h2 { margin: 0; font-size: 22px; }
    ion-searchbar { padding: 0; --background: #fff; }
    ion-segment { --background: #fff; }
    .home-chip { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; max-width: 100%; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; color: #2E5F5A; font: 600 13px 'Work Sans', sans-serif; }
    .home-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .course-opt { display: block; width: 100%; text-align: left; min-height: 48px; padding: 8px 14px; border: 0; border-bottom: 1px solid #EFEAD9; background: #fff; font-family: inherit; color: #1F3532; }
    .format-select { min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid #D9D2BA; background: #fff; color: #1F3532; font-weight: 600; font-size: 14px; }
    .format-pill { background: #F3E4D6; color: #7A4220; }
    .alert-row { display: flex; align-items: center; gap: 12px; margin: -8px 0 4px; }
    .alert-row a { font-size: 13px; font-weight: 600; color: #2E5F5A; }
    .free { background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 14px 16px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
    .free-top { display: flex; align-items: center; gap: 12px; }
    .result { display: block; text-decoration: none; color: inherit; background: #fff; border: 1px solid #E6DFC9; border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="end"><app-notifications-bell /></ion-buttons></ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-pad find">
        <h1 class="sr-only">{{ t('find.title') }}</h1>
        <section class="filters" [attr.aria-label]="t('find.filters')">
          <ion-segment [value]="mode()" (ionChange)="setMode($event)">
            <ion-segment-button value="near"><ion-label>{{ t('find.near') }}</ion-label></ion-segment-button>
            <ion-segment-button value="course"><ion-label>{{ t('find.byCourse') }}</ion-label></ion-segment-button>
          </ion-segment>
          @if (mode() === 'near') {
            <div class="where">
              <div style="flex: 1; min-width: 0">
                <span class="group-label">{{ t('find.searchingAround') }}</span>
                <strong style="display: block">{{ centreLabel() }}</strong>
              </div>
              <ion-button size="small" fill="outline" (click)="useMyLocation()"><ion-icon slot="start" name="locate"></ion-icon>{{ t('find.myLocation') }}</ion-button>
            </div>
            <div class="group">
              <span class="group-label" id="radius-label">{{ t('find.distance') }}</span>
              <div class="chips" role="group" aria-labelledby="radius-label">
                @for (r of radii; track r) {
                  <button type="button" class="chip" [class.on]="radius() === r" [attr.aria-pressed]="radius() === r" (click)="setRadius(r)">{{ r }} km</button>
                }
              </div>
            </div>
          } @else {
            <div class="group">
              <span class="group-label">{{ t('find.course') }}</span>
              <ion-searchbar [placeholder]="t('find.searchCourse')" [value]="course()?.name ?? ''" [debounce]="250" (ionInput)="searchCourse($event)"></ion-searchbar>
              @if (suggestions().length) {
                <div style="border: 1px solid #E6DFC9; border-radius: 12px; overflow: hidden">
                  @for (c of suggestions(); track c.id) {
                    <button type="button" class="course-opt" (click)="pickCourse(c)"><strong>{{ c.name }}</strong><br><span class="muted" style="font-size: 12px">{{ c.city }}</span></button>
                  }
                </div>
              }
              @if (homeCourse(); as h) {
                @if (course()?.id !== h.id) {
                  <button type="button" class="home-chip" (click)="pickCourse(h)">
                    <ion-icon name="home" aria-hidden="true"></ion-icon><span>{{ t('find.homeCourse', { name: h.name }) }}</span>
                  </button>
                }
              }
            </div>
          }
          <div class="group">
            <span class="group-label" id="when-label">{{ t('find.when') }}</span>
            <div class="chips" role="group" aria-labelledby="when-label">
              @for (w of whens; track w[0]) {
                <button type="button" class="chip" [class.on]="when() === w[0]" [attr.aria-pressed]="when() === w[0]" (click)="setWhen(w[0])">{{ t(w[1]) }}</button>
              }
            </div>
          </div>
          <div class="group">
            <span class="group-label" id="format-label">{{ t('format.label') }}</span>
            <ion-select class="format-select" interface="action-sheet" aria-labelledby="format-label"
                        [value]="format() ?? 'any'" [cancelText]="t('common.cancel')" (ionChange)="setFormat($event)">
              <ion-select-option value="any">{{ t('format.any') }}</ion-select-option>
              @for (f of formats; track f) {
                <ion-select-option [value]="f">{{ t('format.' + f) }}</ion-select-option>
              }
            </ion-select>
          </div>
        </section>

        <section aria-labelledby="results-title">
          @if (mode() === 'near' || course()) {
            <div class="alert-row">
              <ion-button size="small" fill="outline" [disabled]="alertBusy() || alertSaved()" (click)="saveAlert()">
                <ion-icon slot="start" [name]="alertSaved() ? 'checkmark' : 'notifications-outline'"></ion-icon>{{ alertSaved() ? t('alerts.saved') : t('alerts.save') }}
              </ion-button>
              <a routerLink="/alerts">{{ t('alerts.manage') }}</a>
            </div>
            <p class="muted" style="margin: 0 0 24px; font-size: 13px">{{ alertSaved() ? t('alerts.savedHint') : t('alerts.hint') }}</p>
          }

          <div class="results-head">
            <h2 id="results-title">{{ t('find.openRounds') }}</h2>
            @if (mode() === 'near' || course()) {
              <span class="muted" style="font-size: 13px" aria-live="polite">{{ loading() ? t('find.searching') : results().length ? results().length + ' · ' + areaLabel() : areaLabel() }}</span>
            }
          </div>
          @if (error()) { <p role="alert" style="color: #9C5428; margin: 0 0 12px">{{ error() }}</p> }

        <div>
          @for (r of results(); track r.round_id) {
            <a class="result" [routerLink]="['/round', r.round_id]">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px">
                <span style="display: flex; gap: 6px; flex-wrap: wrap">
                  @if (r.spots_left > 0) {
                    <span class="pill">{{ t('home.spotsLeft', { count: r.spots_left }) }}</span>
                  } @else {
                    <span class="pill full">{{ t('find.fullWaitlist') }}</span>
                  }
                  @if (r.format && r.format !== 'casual') { <span class="pill format-pill">{{ t('format.' + r.format) }}</span> }
                </span>
                @if (r.distance_km !== null) { <span class="muted" style="font-size: 13px">{{ t('find.kmAway', { km: r.distance_km }) }}</span> }
              </div>
              <h3 style="margin: 0 0 6px; font-size: 18px">{{ r.course_name }}</h3>
              <strong style="font-size: 14px">{{ i18n.date(r.tee_time) }}</strong>
              <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #EFEAD9">
                <span class="muted" style="font-size: 13px">{{ r.host_name }}{{ r.host_handicap !== null ? ' · ' + t('common.hcp', { hcp: r.host_handicap }) : '' }}</span>
                <span style="font-size: 13px; font-weight: 600; color: #2E5F5A">{{ t('find.viewJoin') }}</span>
              </div>
            </a>
          }
          @if (mode() === 'course' && !course()) {
            <p class="muted" style="text-align: center; padding: 32px 8px; margin: 0">{{ t('find.pickCourseHint') }}</p>
          } @else if (!loading() && !results().length && !error()) {
            <div style="text-align: center; padding: 8px 8px 32px; display: flex; flex-direction: column; align-items: center; gap: 10px">
              <app-illustration scene="search" style="width: 180px" />
              <h3 style="margin: 0">{{ t('find.emptyTitle') }}</h3>
              <p class="muted" style="margin: 0; font-size: 14px">{{ t('find.emptyText') }}</p>
              <ion-button routerLink="/create">{{ t('rounds.post') }}</ion-button>
              <ion-button fill="clear" routerLink="/free">{{ t('free.cta') }}</ion-button>
            </div>
          }
        </div>
        </section>

        @if (mode() === 'near' || course()) {
          <section aria-labelledby="free-title">
            <div class="results-head">
              <h2 id="free-title">{{ t('free.findTitle') }}</h2>
              <a routerLink="/free" style="font-size: 13px; font-weight: 600; color: #2E5F5A">{{ t('free.cta') }}</a>
            </div>
            @for (f of free(); track f.id) {
              <div class="free">
                <div class="free-top">
                  <app-avatar [name]="f.display_name" [path]="f.avatar_url" [size]="40" />
                  <div style="flex: 1; min-width: 0">
                    <strong>{{ f.display_name }}</strong>
                    <div class="muted" style="font-size: 13px">{{ f.handicap_index !== null ? t('common.hcp', { hcp: f.handicap_index }) + ' · ' : '' }}{{ f.place_name ? t('find.nearName', { name: f.place_name }) : '' }}</div>
                  </div>
                  @if (invitedIds().has(f.user_id)) {
                    <span class="pill ok">{{ t('free.invited') }}</span>
                  } @else {
                    <ion-button size="small" (click)="invite(f)">{{ t('free.invite') }}</ion-button>
                  }
                </div>
                <strong style="font-size: 14px">{{ dayLabel(f.day) }} · {{ t('free.part.' + f.part_of_day) }}</strong>
                @if (f.note) { <span class="muted" style="font-size: 14px">“{{ f.note }}”</span> }
              </div>
            } @empty {
              <p class="muted" style="margin: 0; font-size: 14px">{{ t('free.noneHere') }}</p>
            }
          </section>
        }
      </div>

    </ion-content>
  `
})
export class FindPage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private rounds = inject(RoundsService);
  private location = inject(LocationService);
  private profiles = inject(ProfileService);
  private notifications = inject(NotificationsService);
  private alerts = inject(AlertsService);
  private availability = inject(AvailabilityService);
  private actionSheets = inject(ActionSheetController);
  private router = inject(Router);

  readonly radii = RADII;
  readonly whens: [When, string][] = [['any', 'find.anyDate'], ['weekdays', 'find.weekdays'], ['this', 'find.thisWeekend'], ['next', 'find.nextWeekend']];

  mode = signal<Mode>('near');
  radius = signal(25);
  when = signal<When>('any');
  readonly formats = ROUND_FORMATS;
  format = signal<RoundFormat | null>(null);
  centre = signal<Position | null>(null);
  centreName = signal('');
  course = signal<Course | null>(null);
  homeCourse = signal<Course | null>(null);
  suggestions = signal<Course[]>([]);
  results = signal<RoundResult[]>([]);
  free = signal<FreePlayer[]>([]);
  invitedIds = signal(new Set<string>());
  alertBusy = signal(false);
  alertSaved = signal(false);
  loading = signal(false);
  error = signal('');

  constructor() {
    addIcons({ locate, home, notificationsOutline, checkmark });
  }

  async ionViewWillEnter() {
    this.notifications.refreshUnread();
    await this.loadHomeCourse();
    const saved = this.alerts.pending;
    this.alerts.pending = null;
    if (saved && await this.applySaved(saved)) return;
    if (!this.centre()) await this.setDefaultCentre();
    this.load();
  }

  /** Sets the filters from a saved search opened on the Saved searches page. */
  private async applySaved(a: SearchAlert) {
    try {
      if (a.course_id) {
        const c = await this.rounds.getCourse(a.course_id);
        if (!c) return false;
        this.mode.set('course');
        this.course.set(c);
      } else {
        if (a.lat == null || a.lng == null) return false;
        this.mode.set('near');
        this.centre.set({ lat: a.lat, lng: a.lng });
        this.centreName.set(a.place_name ?? '');
        if (a.radius_km) this.radius.set(a.radius_km);
      }
    } catch {
      return false;
    }
    // A saved "weekends" search shows the coming weekend
    this.when.set(a.days === 'weekday' ? 'weekdays' : a.days === 'weekend' ? 'this' : 'any');
    this.format.set(a.format);
    this.suggestions.set([]);
    this.load();
    this.alertSaved.set(true);
    return true;
  }

  /** Re-read on every visit, since the home course can change in Edit profile. */
  private async loadHomeCourse() {
    try {
      const id = (await this.profiles.load())?.home_course_id;
      if (id !== this.homeCourse()?.id) this.homeCourse.set(id ? await this.rounds.getCourse(id) : null);
    } catch { /* the shortcut just doesn't show */ }
  }

  /** Default search centre: the player's home course, falling back to the device location. */
  private async setDefaultCentre() {
    const c = this.homeCourse();
    if (c) {
      this.centre.set({ lat: c.lat, lng: c.lng });
      this.centreName.set(c.name);
      return;
    }
    try { await this.useMyLocation(false); } catch { /* leave unset; the user can tap "My location" */ }
  }

  centreLabel() {
    const name = this.centreName();
    return name === MY_LOCATION ? this.t('find.yourLocation') : name ? this.t('find.nearName', { name }) : this.t('find.chooseLocation');
  }

  areaLabel() {
    return this.mode() === 'course' ? (this.course()?.name ?? this.t('find.pickCourse')) : this.t('find.within', { km: this.radius() });
  }

  async useMyLocation(reload = true) {
    try {
      this.centre.set(await this.location.current());
      this.centreName.set(MY_LOCATION);
      this.error.set('');
      if (reload) this.load();
    } catch {
      this.error.set(this.t('find.locationError'));
    }
  }

  setMode(ev: Event) {
    this.mode.set((ev as CustomEvent).detail.value as Mode);
    // Start "By course" on the home course, so it's one tap away
    if (this.mode() === 'course' && !this.course() && this.homeCourse()) this.course.set(this.homeCourse());
    this.load();
  }
  setRadius(r: number) { this.radius.set(r); this.load(); }
  setWhen(w: When) { this.when.set(w); this.load(); }
  setFormat(ev: Event) {
    const v = (ev as CustomEvent).detail.value as RoundFormat | 'any';
    this.format.set(v === 'any' ? null : v);
    this.load();
  }

  /** Players free to play in the same area and dates. Extra, so failures stay quiet. */
  private async loadFree(range: { from: Date; to: Date } | null) {
    const byCourse = this.mode() === 'course';
    try {
      const free = await this.availability.find({
        lat: byCourse ? null : this.centre()!.lat,
        lng: byCourse ? null : this.centre()!.lng,
        radiusKm: this.radius(),
        courseId: byCourse ? this.course()!.id : null,
        from: range ? isoDay(range.from) : null,
        to: range ? isoDay(range.to) : null
      });
      this.free.set(this.when() === 'weekdays' ? free.filter((f) => isWeekday(this.dayDate(f.day))) : free);
    } catch {
      this.free.set([]);
    }
  }

  /** YYYY-MM-DD as a local date. */
  private dayDate(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  dayLabel(iso: string) {
    return new Intl.DateTimeFormat(this.i18n.locale(), { weekday: 'long', day: 'numeric', month: 'short' }).format(this.dayDate(iso));
  }

  /** Saves the current search: a push when someone posts a matching round. */
  async saveAlert() {
    const byCourse = this.mode() === 'course';
    this.alertBusy.set(true);
    this.error.set('');
    try {
      await this.alerts.create({
        courseId: byCourse ? this.course()!.id : null,
        lat: byCourse ? null : this.centre()?.lat,
        lng: byCourse ? null : this.centre()?.lng,
        radiusKm: this.radius(),
        placeName: byCourse ? null : this.centreName() === MY_LOCATION ? this.t('alerts.myArea') : this.centreName(),
        // "This/next weekend" become "weekends" for an alert that keeps running
        days: this.when() === 'any' ? 'any' : this.when() === 'weekdays' ? 'weekday' : 'weekend',
        format: this.format()
      });
      this.alertSaved.set(true);
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'alerts.saveError'));
    } finally {
      this.alertBusy.set(false);
    }
  }

  /** Pick one of my rounds with room to invite them to, or post a new one. */
  async invite(f: FreePlayer) {
    let mine: { id: string; tee_time: string; course_name: string }[] = [];
    try { mine = await this.rounds.myOpenHostedRounds(); } catch { /* offer to post a round instead */ }
    const sheet = await this.actionSheets.create({
      header: this.t('free.inviteTo', { name: f.display_name }),
      buttons: [
        ...mine.map((r) => ({
          text: r.course_name + ' · ' + this.i18n.date(r.tee_time),
          handler: () => { this.sendInvite(r.id, f); }
        })),
        { text: this.t('free.postForThem'), handler: () => { this.router.navigateByUrl('/create'); } },
        { text: this.t('common.cancel'), role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  private async sendInvite(roundId: string, f: FreePlayer) {
    this.error.set('');
    try {
      await this.rounds.invite(roundId, f.user_id);
      this.invitedIds.update((s) => new Set(s).add(f.user_id));
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'free.inviteError'));
    }
  }

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
    this.alertSaved.set(false);
    if (byCourse && !this.course()) { this.results.set([]); this.free.set([]); return; }
    if (!byCourse && !this.centre()) { this.results.set([]); this.free.set([]); return; }
    this.loadFree(range);

    this.loading.set(true);
    this.error.set('');
    try {
      const rounds = await this.rounds.findRounds({
        lat: byCourse ? this.course()!.lat : this.centre()!.lat,
        lng: byCourse ? this.course()!.lng : this.centre()!.lng,
        radiusKm: byCourse ? 1 : this.radius(),
        courseId: byCourse ? this.course()!.id : null,
        from: range?.from ?? null,
        to: range?.to ?? null,
        format: this.format()
      });
      // Weekdays: filtered here (the search returns the next 50 rounds, plenty for now)
      this.results.set(this.when() === 'weekdays' ? rounds.filter((r) => isWeekday(new Date(r.tee_time))) : rounds);
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'find.loadError'));
    } finally {
      this.loading.set(false);
    }
  }
}
