import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea, IonText } from '@ionic/angular/standalone';
import { AlertsService } from '../../services/alerts.service';

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

  constructor(private alertsService: AlertsService) {}

  ngOnInit() {
    this.getCurrentLocation();
  }

  async getCurrentLocation() {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      this.form.update(f => ({
        ...f,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }));
    } catch (err) {
      console.error('Geolocation error:', err);
      this.errorMsg = 'Failed to fetch location';
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    this.form.update(f => ({ ...f, file }));
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
}
