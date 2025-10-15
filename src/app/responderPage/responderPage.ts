import { Component, OnInit, OnDestroy } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { SocketService } from '../services/socket.service';
import { AuthService } from '../services/auth.service';

@Component({ selector:'app-responder', template:`
<ion-content class="ion-padding">
  <ion-toggle [(ngModel)]="online" (ionChange)="toggle()"></ion-toggle>
  <ion-list>
    <ion-item *ngFor="let a of alerts">
      <ion-label>{{a.description}}</ion-label>
      <ion-button size="small" (click)="accept(a._id)">Accept</ion-button>
    </ion-item>
  </ion-list>
</ion-content>` })
export class ResponderPage implements OnInit, OnDestroy {
  online=false; watchId?:string; alerts:any[]=[];
  constructor(private sock:SocketService, private auth:AuthService){}
  ngOnInit(){
    this.sock.connect();
    this.sock.on('newAlert', (a:any)=> this.alerts = [a, ...this.alerts]);
  }
  ngOnDestroy(){ this.sock.disconnect(); }
  async toggle(){
    if(this.online){
      const prof:any = await fetch('/api/auth/profile'); // or via service
      const userId = (await (await fetch('')).json())?._id; // replace with AuthService.me()
    }
  }
  async goOnline(userId:string){
    const pos:Position = await Geolocation.getCurrentPosition();
    this.sock.emit('responder:online', { userId, coordinates:[pos.coords.longitude, pos.coords.latitude] });
    // optional periodic updates
    this.watchId = (await Geolocation.watchPosition({}, p=>{
      if(!p) return;
      this.sock.emit('responder:loc', { coordinates:[p.coords.longitude, p.coords.latitude] });
    })) as any;
  }
  accept(id:string){ /* call AlertsService.accept(id) */ }
}