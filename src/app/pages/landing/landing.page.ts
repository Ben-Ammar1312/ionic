import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.page.html',
  imports: [IonContent, IonSpinner],
})
/**
 * Splash screen shown while we determine where to redirect the user.
 * It checks for a cached profile or token and routes to the correct dashboard.
 */
export class LandingPage implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /**
   * Selects the next route as soon as the component mounts.
   */
  async ngOnInit(): Promise<void> {
    const existing = this.auth.currentUser();
    if (existing) {
      this.redirect(existing);
      return;
    }

    if (this.auth.token()) {
      const profile = await this.auth.ensureUserLoaded();
      if (profile) {
        this.redirect(profile);
        return;
      }
    }

    this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }

  /**
   * Sends the user to the correct dashboard based on their role.
   */
  private redirect(user: UserProfile): void {
    const target = user.role === 'responder' ? '/respond' : '/alerts';
    this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
