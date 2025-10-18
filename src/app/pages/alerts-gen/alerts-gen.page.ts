import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonText,
  ActionSheetController
} from '@ionic/angular/standalone';
import { AlertsService } from '../../services/alerts.service';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Photos } from '../../services/photo.service';

@Component({
  selector: 'app-alerts-gen',
  templateUrl: './alerts-gen.page.html',
  styleUrls: ['./alerts-gen.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonText
  ]
})
export class AlertsGenPage implements OnInit {
  form = signal({
    description: '',
    type: '',
    numInjured: null as number | null,
    file: null as File | null,
    lat: null as number | null,
    lng: null as number | null
  });

  loading = false;
  successMsg = '';
  errorMsg = '';
  temporaryPhotos: string[] = [];

  constructor(
    private alertsService: AlertsService,
    private photos: Photos,
    private actionSheetCtrl: ActionSheetController // ✅ FIX: Injected properly
  ) {}

  ngOnInit() {
    this.getCurrentLocation();
  }

  onDescriptionInput(event: CustomEvent) {
    const value = (event.detail as { value: string | null }).value ?? '';
    this.form.update(prev => ({ ...prev, description: value }));
  }

  onTypeChange(event: CustomEvent) {
    const value = (event.detail as { value: string | undefined }).value ?? '';
    this.form.update(prev => ({ ...prev, type: value }));
  }

  onNumInjuredInput(event: CustomEvent) {
    const raw = (event.detail as { value: string | null }).value;
    const parsed = raw === null || raw.trim() === '' ? null : Number(raw);
    this.form.update(prev => ({ ...prev, numInjured: Number.isNaN(parsed) ? null : parsed }));
  }

  async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });
      this.setCoords(position.coords.latitude, position.coords.longitude);
      return;
    } catch (err) {
      console.error('Geolocation error:', err);
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const fallback = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
          });
          this.setCoords(fallback.coords.latitude, fallback.coords.longitude);
          return;
        } catch (fallbackErr) {
          console.error('Fallback geolocation error:', fallbackErr);
        }
      }
      this.errorMsg = 'Failed to fetch location. Check permissions or use a secure connection.';
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    this.form.update(f => ({ ...f, file }));
  }

  async pickPhoto() {
    try {
      const result = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 70
      });
      if (!result.dataUrl) {
        return;
      }
      const file = await this.dataUrlToFile(result.dataUrl, result.format || 'jpeg');
      this.form.update(f => ({ ...f, file }));
    } catch (err) {
      console.error('Camera error:', err);
      this.errorMsg = 'Could not access camera or gallery';
    }
  }

  private setCoords(lat: number, lng: number) {
    this.form.update(f => ({
      ...f,
      lat,
      lng
    }));
  }

  private async dataUrlToFile(dataUrl: string, format: string): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], `alert-${Date.now()}.${format}`, { type: blob.type });
  }

  async submitAlert() {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const { description, type, numInjured, file, lat, lng } = this.form();
      if (!lat || !lng) throw new Error('Location missing');

      const response = await this.alertsService.create({
        description,
        type,
        numInjured: numInjured ?? undefined,
        file: file ?? undefined,
        lat,
        lng
      });

      this.successMsg = `Alert sent successfully. Nearby responders: ${response.nearbyRespondersCount}`;
      this.form.set({
        description: '',
        type: '',
        numInjured: null,
        file: null,
        lat,
        lng
      });
    } catch (err: any) {
      this.errorMsg = err.error?.message || 'Failed to send alert';
    } finally {
      this.loading = false;
    }
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Ajouter une photo',
      buttons: [
        {
          text: 'Prendre une photo',
          icon: 'camera',
          handler: () => {
            this.photos.takePicture(); // ✅ added `this.`
          },
        },
        {
          text: 'Choisir depuis la galerie',
          icon: 'image',
          handler: async () => {
            const result = await this.photos.selectionnerPhotos(); // ✅ added `this.`
            const tab = result.photos.map((photo) => photo.webPath);
            this.temporaryPhotos = [...tab];
          },
        },
      ],
    });

    await actionSheet.present();
  }
}
