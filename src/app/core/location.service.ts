import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Position } from './models';

@Injectable({ providedIn: 'root' })
export class LocationService {
  /** Device location. Asks for permission on first use; works in the browser too. */
  async current(): Promise<Position> {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }
}
