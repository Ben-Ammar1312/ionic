import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserRole = 'user' | 'responder';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse extends UserProfile {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'sos_token';
  private userKey = 'sos_user';
  private userSubject = new BehaviorSubject<UserProfile | null>(this.loadStoredUser());

  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(payload: { name: string; email: string; password: string; role: UserRole }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.api}/api/auth/register`, payload)
      .pipe(tap((resp) => this.setSession(resp)));
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.api}/api/auth/login`, payload)
      .pipe(tap((resp) => this.setSession(resp)));
  }

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.api}/api/auth/profile`).pipe(tap((profile) => this.setUser(profile)));
  }

  ensureUserLoaded(): Observable<UserProfile | null> {
    const existing = this.userSubject.value;
    if (existing) {
      return of(existing);
    }
    if (!this.token()) {
      return of(null);
    }
    return this.me();
  }

  token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  currentUser(): UserProfile | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.token() && !!this.userSubject.value;
  }

  isResponder(): boolean {
    return this.userSubject.value?.role === 'responder';
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
  }

  private setSession(resp: AuthResponse): void {
    this.setToken(resp.token);
    const { token, ...profile } = resp;
    this.setUser(profile);
  }

  private setUser(profile: UserProfile): void {
    localStorage.setItem(this.userKey, JSON.stringify(profile));
    this.userSubject.next(profile);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private loadStoredUser(): UserProfile | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }
}
