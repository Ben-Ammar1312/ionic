import { Component } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { AlertsService } from '../services/alerts.service';

@Component({ selector:'app-report', template:`
<ion-content class="ion-padding">
  <ion-textarea [(ngModel)]="desc" placeholder="What happened?"></ion-textarea>
  <ion-input type="number" [(ngModel)]="num"></ion-input>
  <input type="file" (change)="pick($event)" />
  <ion-button expand="block" (click)="send()">Send SOS</ion-button>
</ion-content>` })
export class ReportPage {
  desc=''; num?:number; file?:File;
  constructor(private alerts:AlertsService){}
  pick(e:any){ this.file = e.target.files?.[0]; }
  async send(){
    const { coords } = await Geolocation.getCurrentPosition();
    await this.alerts.create({
      description:this.desc, numInjured:this.num,
      lng:coords.longitude, lat:coords.latitude, file:this.file
    }).toPromise();
    // show toast… 
  }
}