import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn:'root' })
export class AlertsService {
  constructor(private http:HttpClient){}
  list(){ return this.http.get(`${environment.api}/api/alerts`); }

  create({ description, numInjured, lng, lat, file }: {
    description:string; numInjured?:number; lng:number; lat:number; file?:File;
  }){
    const fd = new FormData();
    fd.append('description', description);
    if(numInjured!=null) fd.append('numInjured', String(numInjured));
    fd.append('location', JSON.stringify({ type:'Point', coordinates:[lng,lat] }));
    if(file) fd.append('photo', file);
    return this.http.post(`${environment.api}/api/alerts`, fd);
  }

  accept(id:string){ return this.http.patch(`${environment.api}/api/alerts/${id}/accept`, {}); }
}