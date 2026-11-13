import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonInput, IonSpinner, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locate, home, trashOutline } from 'ionicons/icons';
import { I18nService } from '../../core/i18n.service';
import { AvailabilityService, isoDay } from '../../core/availability.service';
import { LocationService } from '../../core/location.service';
import { ProfileService } from '../../core/profile.service';
import { RoundsService } from '../../core/rounds.service';
import { CartPref, MyAvailability, PartOfDay, Position } from '../../core/models';

const DAYS_SHOWN = 14;
const RADII = [10, 25, 50, 100];
const PARTS: PartOfDay[] = ['any', 'morning', 'afternoon', 'evening'];

/** "I'm free": post a day you could play, without a course or tee time. Hosts nearby can invite you. */
@Component({
  selector: 'app-free',
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonInput, IonSpinner, IonToggle],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 22px; padding-bottom: 32px; }
    .group { display: flex; flex-direction: column; gap: 8px; }
    .label { font-size: 15px; font-weight: 600; color: var(--pp-ink2); }
    .days { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin: 0 -24px; padding-left: 24px; padding-right: 24px; scrollbar-width: none; }
    .day { flex: none; width: 58px; min-height: 64px; border-radius: var(--pp-radius-control); border: 1px solid var(--pp-rule-strong); background: var(--pp-surface); color: var(--pp-ink); font: 600 13px 'Hanken Grotesk Variable', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
    .day strong { font-size: 18px; }
    .day.on { background: var(--pp-deep); border-color: var(--pp-deep); color: #fff; }
    .day.taken:not(.on) { border-color: var(--pp-deep); border-width: 2px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    /* Sized by the label ("Nachmittags" gets more room), never broken mid-word */
    .chip { flex: 1 1 auto; white-space: nowrap; min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--pp-rule-strong); background: var(--pp-surface); color: var(--pp-ink); font: 600 13px 'Hanken Grotesk Variable', sans-serif; }
    .chip.on { background: var(--pp-deep); border-color: var(--pp-deep); color: #fff; }
    .where { display: flex; align-items: center; gap: 12px; background: var(--pp-surface); border: 1px solid var(--pp-rule); border-radius: var(--pp-radius-group); padding: 12px 14px; }
    ion-input { --background: var(--pp-surface); --padding-start: 14px; border: 1px solid var(--pp-rule-strong); border-radius: var(--pp-radius-control); overflow: hidden; min-height: 48px; }
    .card { background: var(--pp-surface); border: 1px solid var(--pp-rule); border-radius: var(--pp-radius-group); overflow: hidden; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding: 8px 6px 8px 16px; border-bottom: 1px solid var(--pp-rule-soft); }
    .row:last-child { border-bottom: 0; }
  `],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/find" text=""></ion-back-button></ion-buttons>
        <ion-title>{{ t('free.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-pad wrap">
        <p class="muted" style="margin: 0">{{ t('free.intro') }}</p>

        <div class="group">
          <span class="label" id="day-label">{{ t('free.day') }}</span>
          <div class="days" role="group" aria-labelledby="day-label">
            @for (d of days; track d.iso) {
              <button type="button" class="day" [class.on]="day() === d.iso" [class.taken]="postedDays().has(d.iso)"
                      [attr.aria-pressed]="day() === d.iso" [attr.aria-label]="i18n.date(d.date, 'dayDateYear')" (click)="pickDay(d.iso)">
                <span>{{ weekday(d.date) }}</span><strong>{{ d.date.getDate() }}</strong>
              </button>
            }
          </div>
        </div>

        <div class="group">
          <span class="label" id="part-label">{{ t('free.when') }}</span>
          <div class="chips" role="group" aria-labelledby="part-label">
            @for (p of parts; track p) {
              <button type="button" class="chip" [class.on]="part() === p" [attr.aria-pressed]="part() === p" (click)="part.set(p)">{{ t('free.part.' + p) }}</button>
            }
          </div>
        </div>

        <div class="group">
          <span class="label">{{ t('free.where') }}</span>
          <div class="where">
            <div style="flex: 1; min-width: 0"><strong>{{ placeLabel() }}</strong></div>
            <ion-button size="small" fill="outline" (click)="useMyLocation()"><ion-icon slot="start" name="locate"></ion-icon>{{ t('find.myLocation') }}</ion-button>
          </div>
          @if (homeCourse(); as h) {
            @if (placeName() !== h.name) {
              <ion-button size="small" fill="clear" (click)="useHome()" style="align-self: flex-start; margin: 0"><ion-icon slot="start" name="home"></ion-icon>{{ t('find.homeCourse', { name: h.name }) }}</ion-button>
            }
          }
        </div>

        <div class="group">
          <span class="label" id="radius-label">{{ t('free.travel') }}</span>
          <div class="chips" role="group" aria-labelledby="radius-label">
            @for (r of radii; track r) {
              <button type="button" class="chip" [class.on]="radius() === r" [attr.aria-pressed]="radius() === r" (click)="radius.set(r)">{{ r }} km</button>
            }
          </div>
        </div>

        <div class="group">
          <span class="label" id="cart-label">{{ t('cart.label') }}</span>
          <div class="chips" role="group" aria-labelledby="cart-label">
            @for (c of carts; track c) {
              <button type="button" class="chip" [class.on]="cart() === c" [attr.aria-pressed]="cart() === c" (click)="cart.set(c)">{{ t('cart.' + (c ?? 'any')) }}</button>
            }
          </div>
        </div>

        @if (isWoman()) {
          <div class="group">
            <ion-toggle [checked]="womenOnly()" (ionChange)="womenOnly.set($event.detail.checked)" style="width: 100%"><strong>{{ t('womenOnly.label') }}</strong></ion-toggle>
            <small class="muted" style="margin-top: -4px">{{ t('womenOnly.freeHint') }}</small>
          </div>
        }

        <div class="group">
          <span class="label" id="note-label">{{ t('free.note') }}</span>
          <ion-input aria-labelledby="note-label" [maxlength]="200" [placeholder]="t('free.notePlaceholder')" [(ngModel)]="note"></ion-input>
        </div>

        @if (error()) { <p role="alert" style="color: var(--pp-accent-ink); margin: 0">{{ error() }}</p> }
        @if (saved()) { <p role="status" style="color: var(--pp-deep); margin: 0; font-weight: 600">{{ t('free.saved') }}</p> }
        <ion-button expand="block" [disabled]="busy() || !centre()" (click)="post()">
          @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { {{ postedDays().has(day()) ? t('free.update') : t('free.post') }} }
        </ion-button>

        @if (mine().length) {
          <div class="group">
            <span class="label">{{ t('free.mine') }}</span>
            <div class="card">
              @for (a of mine(); track a.id) {
                <div class="row">
                  <span style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
                    <strong>{{ dayLabel(a.day) }} · {{ t('free.part.' + a.part_of_day) }}{{ a.cart ? ' · ' + t('cart.' + a.cart) : '' }}{{ a.women_only ? ' · ' + t('womenOnly.label') : '' }}</strong>
                    <span class="muted" style="font-size: 13px">{{ isMyLocation(a.place_name) ? t('find.yourLocation') : t('find.nearName', { name: a.place_name! }) }} · {{ t('free.upTo', { km: a.radius_km }) }}</span>
                  </span>
                  <ion-button fill="clear" color="medium" [attr.aria-label]="t('free.remove', { day: dayLabel(a.day) })" (click)="remove(a)">
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </ion-content>
  `
})
export class FreePage {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  private availability = inject(AvailabilityService);
  private location = inject(LocationService);
  private profiles = inject(ProfileService);
  private rounds = inject(RoundsService);

  readonly radii = RADII;
  readonly parts = PARTS;
  readonly days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + i);
    return { date, iso: isoDay(date) };
  });

  day = signal(this.days[0].iso);
  part = signal<PartOfDay>('any');
  readonly carts: (CartPref | null)[] = [null, 'walk', 'cart'];
  cart = signal<CartPref | null>(null);
  isWoman = signal(false);
  womenOnly = signal(false);

  /** No place name, or one saved before 0027 as "my location" / "mein Standort". */
  isMyLocation(name: string | null) {
    return !name || name === 'my location' || name === 'mein Standort';
  }
  radius = signal(25);
  centre = signal<Position | null>(null);
  placeName = signal('');
  homeCourse = signal<{ name: string; lat: number; lng: number } | null>(null);
  note = '';
  mine = signal<MyAvailability[]>([]);
  postedDays = computed(() => new Set(this.mine().map((a) => a.day)));
  busy = signal(false);
  error = signal('');
  saved = signal(false);

  constructor() {
    addIcons({ locate, home, trashOutline });
  }

  async ionViewWillEnter() {
    this.loadMine();
    this.profiles.isWoman().then((w) => this.isWoman.set(w), () => {});
    if (this.centre()) return;
    try {
      const id = (await this.profiles.load())?.home_course_id;
      const c = id ? await this.rounds.getCourse(id) : null;
      if (c) {
        this.homeCourse.set(c);
        this.useHome();
        return;
      }
    } catch { /* fall back to the device location */ }
    await this.useMyLocation();
  }

  private async loadMine() {
    try { this.mine.set(await this.availability.mine()); } catch { /* the list just doesn't show */ }
  }

  placeLabel() {
    return this.placeName() ? this.t('find.nearName', { name: this.placeName() }) : this.centre() ? this.t('find.yourLocation') : this.t('find.chooseLocation');
  }

  useHome() {
    const h = this.homeCourse();
    if (!h) return;
    this.centre.set({ lat: h.lat, lng: h.lng });
    this.placeName.set(h.name);
  }

  async useMyLocation() {
    try {
      this.centre.set(await this.location.current());
      this.placeName.set('');
      this.error.set('');
    } catch {
      this.error.set(this.t('find.locationError'));
    }
  }

  /** Picking a day already posted loads what was posted, ready to change. */
  pickDay(iso: string) {
    this.day.set(iso);
    this.saved.set(false);
    const existing = this.mine().find((a) => a.day === iso);
    if (existing) {
      this.part.set(existing.part_of_day);
      this.radius.set(existing.radius_km);
      this.note = existing.note ?? '';
      this.cart.set(existing.cart);
      this.womenOnly.set(existing.women_only);
    }
  }

  weekday(d: Date) {
    return new Intl.DateTimeFormat(this.i18n.locale(), { weekday: 'short' }).format(d);
  }

  dayLabel(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(this.i18n.locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
  }

  async post() {
    const c = this.centre();
    if (!c) return;
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      await this.availability.post({
        day: this.day(), part: this.part(), lat: c.lat, lng: c.lng,
        placeName: this.placeName() || null, radiusKm: this.radius(), note: this.note.trim() || null, cart: this.cart(),
        womenOnly: this.isWoman() && this.womenOnly()
      });
      this.saved.set(true);
      await this.loadMine();
    } catch (e: any) {
      this.error.set(this.i18n.error(e, 'free.postError'));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(a: MyAvailability) {
    const before = this.mine();
    this.mine.set(before.filter((x) => x.id !== a.id));
    try {
      await this.availability.remove(a.id);
    } catch (e: any) {
      this.mine.set(before);
      this.error.set(this.i18n.error(e, 'common.error'));
    }
  }
}
