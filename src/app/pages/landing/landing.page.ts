import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.page.html',
  imports: [IonContent, IonSpinner],
})
export class LandingPage implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  async ngOnInit(): Promise<void> {
    const existing = this.auth.currentUser();
    if (existing) {
      this.redirect(existing);
      return;
    }

    if (this.auth.token()) {
      try {
        const profile = await firstValueFrom(this.auth.me());
        this.redirect(profile);
        return;
      } catch (err) {
        console.error('Failed to load profile', err);
        this.auth.logout();
      }
    }

    this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }

  private redirect(user: UserProfile): void {
    const target = user.role === 'responder' ? '/respond' : '/alerts';
    this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
