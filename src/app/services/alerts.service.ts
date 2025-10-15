import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type AlertStatus = 'pending' | 'accepted' | 'resolved';

export interface Alert {
  _id: string;
  description: string;
  type: string;
  numInjured?: number;
  photoUrl?: string | null;
  status: AlertStatus;
  acceptedBy?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  createdAt: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  constructor(private http: HttpClient) {}

  list(filters?: { status?: 'pending' | 'accepted' | 'active' | 'all'; mine?: boolean }): Observable<Alert[]> {
    const params: Record<string, string> = {};
    if (filters?.status) {
      params['status'] = filters.status;
    }
    if (filters?.mine) {
      params['mine'] = 'true';
    }
    return this.http.get<Alert[]>(`${environment.api}/api/alerts`, { params });
  }

  create(payload: {
    description: string;
    type: string;
    numInjured?: number;
    lng: number;
    lat: number;
    file?: File;
  }): Observable<{ alert: Alert; nearbyRespondersCount: number }> {
    const fd = new FormData();
    fd.append('description', payload.description);
    fd.append('type', payload.type);
    if (payload.numInjured != null) {
      fd.append('numInjured', String(payload.numInjured));
    }
    fd.append(
      'location',
      JSON.stringify({ type: 'Point', coordinates: [payload.lng, payload.lat] })
    );
    if (payload.file) {
      fd.append('photo', payload.file);
    }
    return this.http.post<{ alert: Alert; nearbyRespondersCount: number }>(`${environment.api}/api/alerts`, fd);
  }

  accept(id: string): Observable<Alert> {
    return this.http.patch<Alert>(`${environment.api}/api/alerts/${id}/accept`, {});
  }
}
