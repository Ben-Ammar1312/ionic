import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn:'root' })
export class AuthService {
  private key = 'rr_token';
  constructor(private http:HttpClient){}

  register(d:any){ return this.http.post(`${environment.api}/api/auth/register`, d); }
  login(d:any){ return this.http.post(`${environment.api}/api/auth/login`, d); }
  me(){ return this.http.get(`${environment.api}/api/auth/profile`); }

  token(){ return localStorage.getItem(this.key); }
  setToken(t:string){ localStorage.setItem(this.key,t); }
  clear(){ localStorage.removeItem(this.key); }
}