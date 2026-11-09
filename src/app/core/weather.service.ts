import { Injectable } from '@angular/core';

/** The forecast for one hour at a course. */
export interface TeeWeather {
  /** °C */
  temp: number;
  /** chance of rain, % */
  rainChance: number;
  /** km/h */
  wind: number;
  kind: 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';
}

/** Open-Meteo forecasts reach 16 days ahead. */
const MAX_DAYS_AHEAD = 15;

/** WMO weather codes, grouped. */
function kindOf(code: number): TeeWeather['kind'] {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code <= 48) return 'fog';
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  return 'rain';
}

/**
 * Weather at tee time from Open-Meteo (free, no key, no account). Only the course's coordinates are
 * sent, nothing about the player. Forecasts are kept for the session so revisiting a round is instant.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private cache = new Map<string, Promise<TeeWeather | null>>();

  /** null when the tee time is in the past, too far ahead, or the forecast can't be fetched. */
  atTeeTime(lat: number, lng: number, teeTime: string): Promise<TeeWeather | null> {
    const tee = new Date(teeTime).getTime();
    const ahead = tee - Date.now();
    if (ahead < -3600_000 || ahead > MAX_DAYS_AHEAD * 86400_000) return Promise.resolve(null);
    const key = `${lat.toFixed(3)},${lng.toFixed(3)},${teeTime}`;
    if (!this.cache.has(key)) {
      const result = this.fetch(lat, lng, tee).catch(() => null);
      this.cache.set(key, result);
      result.then((w) => { if (!w) this.cache.delete(key); }); // try again next time
    }
    return this.cache.get(key)!;
  }

  private async fetch(lat: number, lng: number, tee: number): Promise<TeeWeather | null> {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
      timeformat: 'unixtime',
      forecast_days: '16'
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) return null;
    const h = (await res.json()).hourly as { time: number[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; weather_code: number[]; wind_speed_10m: number[] };
    // The hour closest to tee time
    let best = -1;
    for (let i = 0; i < h.time.length; i++) {
      if (best < 0 || Math.abs(h.time[i] * 1000 - tee) < Math.abs(h.time[best] * 1000 - tee)) best = i;
    }
    if (best < 0 || Math.abs(h.time[best] * 1000 - tee) > 2 * 3600_000) return null;
    return {
      temp: Math.round(h.temperature_2m[best]),
      rainChance: h.precipitation_probability[best] ?? 0,
      wind: Math.round(h.wind_speed_10m[best]),
      kind: kindOf(h.weather_code[best])
    };
  }
}
