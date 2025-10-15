import { CommonModule, DatePipe, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { firstValueFrom } from 'rxjs';
import { ToastController } from '@ionic/angular';
import type { RefresherCustomEvent } from '@ionic/angular';
import { AlertsService, Alert } from '../../services/alerts.service';
import { AuthService } from '../../services/auth.service';

declare const L: any;

@Component({
  selector: 'app-alert-giver',
  standalone: true,
  templateUrl: './alert-giver.page.html',
  styleUrls: ['./alert-giver.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonText,
    IonInput,
    IonSpinner,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    CommonModule,
    DatePipe,
  ],
})
export class AlertGiverPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapRef', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  alerts: Alert[] = [];
  loadingAlerts = false;

  createModalOpen = false;
  createLoading = false;
  createError?: string;
  photoPreview?: string;
  photoFile?: File;

  readonly createForm = this.fb.nonNullable.group({
    type: ['medical', Validators.required],
    description: ['', [Validators.required, Validators.minLength(6)]],
    numInjured: [''],
  });

  private map: any;
  private markers = new Map<string, any>();

  constructor(
    private fb: FormBuilder,
    private alertsService: AlertsService,
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  async ngAfterViewInit(): Promise<void> {
    await this.initMap();
    await this.loadAlerts();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
    this.markers.clear();
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.loadAlerts();
    event.detail.complete();
  }

  openCreateModal(): void {
    this.createModalOpen = true;
    this.createError = undefined;
  }

  closeCreateModal(): void {
    if (this.createLoading) {
      return;
    }
    this.createModalOpen = false;
    this.createForm.reset({
      type: 'medical',
      description: '',
      numInjured: '',
    });
    this.clearPhoto();
  }

  onModalDismiss(): void {
    this.createModalOpen = false;
  }

  async submitAlert(): Promise<void> {
    if (this.createForm.invalid || this.createLoading) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.createLoading = true;
    this.createError = undefined;

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      const { longitude, latitude } = position.coords;
      const { description, type, numInjured } = this.createForm.getRawValue();
      const numInjuredValue =
        numInjured !== null && numInjured !== undefined && numInjured !== ''
          ? Number(numInjured)
          : undefined;

      const response = await firstValueFrom(
        this.alertsService.create({
          description,
          type,
          numInjured: numInjuredValue,
          lng: longitude,
          lat: latitude,
          file: this.photoFile,
        })
      );

      this.alerts = [response.alert, ...this.alerts];
      this.addOrUpdateMarker(response.alert);
      this.fitToAlerts();
      this.closeCreateModal();
      const toast = await this.toastCtrl.create({
        message: 'Alert sent successfully.',
        duration: 2500,
        color: 'success',
      });
      toast.present();
    } catch (error: any) {
      console.error(error);
      this.createError =
        error?.error?.message ||
        'Unable to send the alert. Please make sure location permissions are granted.';
    } finally {
      this.createLoading = false;
    }
  }

  async selectPhoto(): Promise<void> {
    try {
      const image = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 70,
      });
      if (!image || !image.dataUrl) {
        return;
      }
      const file = await this.dataUrlToFile(image.dataUrl, image.format || 'jpeg');
      this.photoFile = file;
      this.photoPreview = image.dataUrl;
    } catch (err) {
      const error = err as { message?: string } | undefined;
      if (error?.message && error.message.includes('User cancelled')) {
        return;
      }
      console.warn('Camera error', err);
      this.createError = 'Could not access camera or gallery.';
    }
  }

  clearPhoto(): void {
    this.photoFile = undefined;
    this.photoPreview = undefined;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }

  private async initMap(): Promise<void> {
    if (this.map || !this.mapContainer) {
      return;
    }
    if (typeof L === 'undefined') {
      console.error('Leaflet library is not loaded.');
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

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      this.map.setView([position.coords.latitude, position.coords.longitude], 13);
    } catch {
      this.map.setView([36.8065, 10.1815], 12); // Default to Tunis region
    }

    setTimeout(() => this.map.invalidateSize(), 200);
  }

  private async loadAlerts(): Promise<void> {
    this.loadingAlerts = true;
    try {
      const alerts = await firstValueFrom(this.alertsService.list({ status: 'active' }));
      this.alerts = alerts;
      this.refreshMarkers();
      this.fitToAlerts();
    } catch (error) {
      console.error('Unable to load alerts', error);
    } finally {
      this.loadingAlerts = false;
    }
  }

  private refreshMarkers(): void {
    if (!this.map) {
      return;
    }
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    this.alerts.forEach((alert) => this.addOrUpdateMarker(alert));
  }

  private addOrUpdateMarker(alert: Alert): void {
    if (!this.map || !alert.location || !alert.location.coordinates) {
      return;
    }
    const [lng, lat] = alert.location.coordinates;
    if (lat == null || lng == null) {
      return;
    }

    const existing = this.markers.get(alert._id);
    if (existing) {
      existing.setLatLng([lat, lng]);
      existing.setPopupContent(this.markerPopupContent(alert));
      return;
    }

    const marker = L.marker([lat, lng]).addTo(this.map);
    marker.bindPopup(this.markerPopupContent(alert));
    this.markers.set(alert._id, marker);
  }

  private fitToAlerts(): void {
    if (!this.map || !this.alerts.length || typeof L === 'undefined') {
      return;
    }
    const bounds = L.latLngBounds(
      this.alerts
        .filter((alert) => alert.location?.coordinates)
        .map((alert) => [alert.location.coordinates[1], alert.location.coordinates[0]])
    );
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  private markerPopupContent(alert: Alert): string {
    const injured = alert.numInjured != null ? `<br/>Injured: ${alert.numInjured}` : '';
    return `<strong>${alert.type}</strong><br/>${alert.description}${injured}<br/>Status: ${alert.status}`;
  }

  private async dataUrlToFile(dataUrl: string, format: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const extension = format?.toLowerCase() || 'jpeg';
    return new File([blob], `alert-${Date.now()}.${extension}`, { type: blob.type });
  }
}
