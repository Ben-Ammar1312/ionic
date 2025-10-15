import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
/**
 * Handles authentication state, communication with the backend and persistence of the session.
 * Keeping this logic in one service makes it easy to reuse across guards, pages and interceptors.
 */
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'sos_token';
  private readonly userKey = 'sos_user';
  /**
   * In-memory copy of the user profile to avoid repeated storage parsing.
   */
  private cachedUser: UserProfile | null = this.loadStoredUser();

  /**
   * Creates a new account and immediately stores the session returned by the backend.
   */
  async register(payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${environment.api}/api/auth/register`, payload)
    );
    this.setSession(response);
    return response;
  }

  /**
   * Signs the user in by exchanging credentials for a token and profile.
   */
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${environment.api}/api/auth/login`, payload)
    );
    this.setSession(response);
    return response;
  }

  /**
   * Fetches the currently authenticated user's profile from the backend.
   * The result is cached so other consumers can reuse it.
   */
  async me(): Promise<UserProfile> {
    const profile = await firstValueFrom(
      this.http.get<UserProfile>(`${environment.api}/api/auth/profile`)
    );
    this.setUser(profile);
    return profile;
  }

  /**
   * Makes sure the profile is available in memory.
   * If only the token exists, it fetches the profile; otherwise returns the cached value.
   */
  async ensureUserLoaded(): Promise<UserProfile | null> {
    if (this.cachedUser) {
      return this.cachedUser;
    }
    if (!this.token()) {
      return null;
    }
    try {
      return await this.me();
    } catch {
      this.logout();
      return null;
    }
  }

  /**
   * Returns the persisted bearer token if present.
   */
  token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Provides the cached profile for synchronous use inside components and guards.
   */
  currentUser(): UserProfile | null {
    return this.cachedUser;
  }

  /**
   * Quick check used by guards to see whether the user is signed in and the profile is loaded.
   */
  isAuthenticated(): boolean {
    return !!this.token() && !!this.cachedUser;
  }

  /**
   * Determines if the current user can access responder-only areas.
   */
  isResponder(): boolean {
    return this.cachedUser?.role === 'responder';
  }

  /**
   * Clears the session both from memory and localStorage.
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.cachedUser = null;
  }

  /**
   * Persists the token and profile after registration/login.
   */
  private setSession(response: AuthResponse): void {
    this.setToken(response.token);
    const { token, ...profile } = response;
    this.setUser(profile);
  }

  /**
   * Stores the user profile and keeps an in-memory snapshot.
   */
  private setUser(profile: UserProfile): void {
    localStorage.setItem(this.userKey, JSON.stringify(profile));
    this.cachedUser = profile;
  }

  /**
   * Persists the JWT for later HTTP calls.
   */
  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Reads the cached user from storage when the service is first constructed.
   */
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
