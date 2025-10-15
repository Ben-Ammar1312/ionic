import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService, UserRole } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    RouterLink,
    ReactiveFormsModule,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonText,
    NgIf,
    IonSelect,
    IonSelectOption,
    IonSpinner,
  ],
})
export class RegisterPage {
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    role: ['user' as UserRole, [Validators.required]],
  });
  errorMessage?: string;
  loading = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  get nameInvalid(): boolean {
    const control = this.form.controls.name;
    return control.invalid && (control.dirty || control.touched);
  }

  get emailInvalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.dirty || control.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.dirty || control.touched);
  }

  get confirmInvalid(): boolean {
    const control = this.form.controls.confirmPassword;
    const password = this.form.controls.password.value;
    return (
      control.invalid ||
      (control.value !== password && (control.dirty || control.touched))
    );
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword, role, ...rest } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = undefined;

    try {
      const response = await firstValueFrom(
        this.auth.register({ ...rest, password, role })
      );
      this.redirect(response.role);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Could not create account. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private redirect(role: UserRole): void {
    const target = role === 'responder' ? '/respond' : '/alerts';
    this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
