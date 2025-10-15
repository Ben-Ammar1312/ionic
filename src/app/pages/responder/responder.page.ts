import { CommonModule, DatePipe, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import type { ToggleCustomEvent } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AlertsService, Alert } from '../../services/alerts.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

declare const L: any;

@Component({
  selector: 'app-responder',
  standalone: true,
  templateUrl: './responder.page.html',
  styleUrls: ['./responder.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonSpinner,
    IonIcon,
    NgIf,
    NgFor,
    CommonModule,
    DatePipe,
  ],
})
export class ResponderPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapRef', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  alerts: Alert[] = [];
  loadingAlerts = false;
  acceptingId?: string;
  online = false;

  private map?: any;
  private alertMarkers = new Map<string, any>();
  private responderMarker?: any;
  private locationWatchId?: string;
  private readonly alertsService = inject(AlertsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly socket = inject(SocketService);
  private readonly newAlertListener = (alert: Alert) => this.upsertAlert(alert, true);
  private readonly broadcastAlertListener = (alert: Alert) => this.upsertAlert(alert, false);
  private readonly updateAlertListener = (alert: Alert) => this.processAlertUpdate(alert);

  ngOnInit(): void {
    this.socket.connect();
    this.socket.on('newAlert', this.newAlertListener);
    this.socket.on('alerts:new', this.broadcastAlertListener);
    this.socket.on('alerts:updated', this.updateAlertListener);
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initMap();
    await this.loadAlerts();
    await this.goOnline();
  }

  ngOnDestroy(): void {
    this.socket.off('newAlert', this.newAlertListener);
    this.socket.off('alerts:new', this.broadcastAlertListener);
    this.socket.off('alerts:updated', this.updateAlertListener);
    if (this.online) {
      this.emitOffline();
    }
    this.stopLocationWatch();
    this.socket.disconnect();
    this.alertMarkers.forEach((marker) => marker.remove());
    this.alertMarkers.clear();
    this.responderMarker?.remove();
    this.map?.remove();
  }

  async toggleOnline(event: ToggleCustomEvent): Promise<void> {
    const { checked: desiredState } = event.detail;

    if (desiredState === this.online) {
      return;
    }

    if (desiredState) {
      await this.goOnline();
    } else {
      await this.goOffline();
    }
  }

  async acceptAlert(alert: Alert): Promise<void> {
    if (!this.online) {
      this.presentToast('Go online before responding to alerts.', 'warning');
      return;
    }

    this.acceptingId = alert._id;
    try {
      const updated = await firstValueFrom(this.alertsService.accept(alert._id));
      this.processAlertUpdate(updated);
      this.presentToast('Alert accepted. Let the reporter know you are coming!', 'success');
    } catch (error: any) {
      console.error(error);
      const message = error?.error?.message || 'Could not accept this alert. It may already be taken.';
      this.presentToast(message, 'danger');
    } finally {
      this.acceptingId = undefined;
    }
  }

  async logout(): Promise<void> {
    await this.goOffline(false);
    this.auth.logout();
    this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }

  private async goOnline(): Promise<void> {
    if (this.online) {
      return;
    }

    const user = this.auth.currentUser();
    if (!user) {
      this.logout();
      return;
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      this.updateResponderLocation(position.coords.latitude, position.coords.longitude);
      this.socket.emit('registerResponder', {
        userId: user._id,
        coordinates: [position.coords.longitude, position.coords.latitude],
      });
      this.startLocationWatch(user._id);
      this.online = true;
      this.presentToast('You are now online and visible to nearby alerts.', 'success');
    } catch (error) {
      console.error(error);
      this.presentToast('Location permission is required to go online.', 'danger');
      this.online = false;
    }
  }

  private async goOffline(showToast = true): Promise<void> {
    if (!this.online) {
      return;
    }
    this.emitOffline();
    this.stopLocationWatch();
    this.responderMarker?.remove();
    this.responderMarker = undefined;
    this.online = false;
    if (showToast) {
      this.presentToast('You are offline. Toggle back on when ready.', 'medium');
    }
  }

  private emitOffline(): void {
    this.socket.emit('responderOffline', {});
  }

  private startLocationWatch(userId: string): void {
    if (this.locationWatchId) {
      return;
    }
    this.locationWatchId = Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (position) => {
        if (!position || !position.coords) {
          return;
        }
        const { latitude, longitude } = position.coords;
        this.updateResponderLocation(latitude, longitude);
        this.socket.emit('updateLocation', { coordinates: [longitude, latitude], userId });
      }
    ) as unknown as string;
  }

  private async stopLocationWatch(): Promise<void> {
    if (this.locationWatchId) {
      await Geolocation.clearWatch({ id: this.locationWatchId });
      this.locationWatchId = undefined;
    }
  }

  private async initMap(): Promise<void> {
    if (this.map || !this.mapContainer) {
      return;
    }
    if (typeof L === 'undefined') {
      console.error('Leaflet library not available.');
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.setView([36.8065, 10.1815], 12);
    setTimeout(() => this.map.invalidateSize(), 200);
  }

  private async loadAlerts(): Promise<void> {
    this.loadingAlerts = true;
    try {
      const alerts = await firstValueFrom(this.alertsService.list({ status: 'pending' }));
      this.alerts = alerts;
      this.refreshMarkers();
      this.fitMapToAlerts();
    } catch (error) {
      console.error('Failed to load alerts', error);
      this.presentToast('Unable to retrieve alerts. Please retry shortly.', 'danger');
    } finally {
      this.loadingAlerts = false;
    }
  }

  private refreshMarkers(): void {
    if (!this.map) {
      return;
    }
    this.alertMarkers.forEach((marker) => marker.remove());
    this.alertMarkers.clear();
    this.alerts.forEach((alert) => this.addOrUpdateMarker(alert));
  }

  private addOrUpdateMarker(alert: Alert): void {
    if (!this.map || !alert.location?.coordinates) {
      return;
    }
    const [lng, lat] = alert.location.coordinates;
    if (lat == null || lng == null) {
      return;
    }

    const existing = this.alertMarkers.get(alert._id);
    if (existing) {
      existing.setLatLng([lat, lng]);
      existing.setPopupContent(this.markerPopupContent(alert));
      return;
    }

    const marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [0, -32],
      }),
    }).addTo(this.map);
    marker.bindPopup(this.markerPopupContent(alert));
    this.alertMarkers.set(alert._id, marker);
  }

  private markerPopupContent(alert: Alert): string {
    const injured = alert.numInjured != null ? `<br/>Injured: ${alert.numInjured}` : '';
    return `<strong>${alert.type}</strong><br/>${alert.description}${injured}`;
  }

  private updateResponderLocation(lat: number, lng: number): void {
    if (!this.map || typeof lat !== 'number' || typeof lng !== 'number') {
      return;
    }
    if (!this.responderMarker) {
      this.responderMarker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#2dd36f',
        fillColor: '#2dd36f',
        fillOpacity: 0.9,
      }).addTo(this.map);
      this.responderMarker.bindPopup('You are here');
    } else {
      this.responderMarker.setLatLng([lat, lng]);
    }
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 13));
  }

  private fitMapToAlerts(): void {
    if (!this.map || !this.alerts.length || typeof L === 'undefined') {
      return;
    }
    const positions = this.alerts
      .filter((alert) => alert.location?.coordinates)
      .map((alert) => [alert.location.coordinates[1], alert.location.coordinates[0]]);

    if (positions.length) {
      const bounds = L.latLngBounds(positions);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }

  private upsertAlert(alert: Alert, notify = false): void {
    if (alert.status !== 'pending') {
      this.removeAlert(alert._id);
      return;
    }
    const index = this.alerts.findIndex((a) => a._id === alert._id);
    if (index >= 0) {
      this.alerts[index] = alert;
    } else {
      this.alerts = [alert, ...this.alerts];
      if (notify) {
        this.presentToast('New alert nearby!', 'tertiary');
      }
    }
    this.addOrUpdateMarker(alert);
  }

  private processAlertUpdate(alert: Alert): void {
    if (alert.status === 'pending') {
      this.upsertAlert(alert);
      return;
    }
    this.removeAlert(alert._id);
  }

  private removeAlert(id: string): void {
    const before = this.alerts.length;
    this.alerts = this.alerts.filter((a) => a._id !== id);
    const marker = this.alertMarkers.get(id);
    if (marker) {
      marker.remove();
      this.alertMarkers.delete(id);
    }
    if (before !== this.alerts.length) {
      this.fitMapToAlerts();
    }
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger' | 'tertiary' | 'medium'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
    });
    toast.present();
  }
}
