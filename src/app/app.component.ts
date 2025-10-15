import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  /**
   * Root shell for the Ionic application. The component itself does not need any logic
   * because its only responsibility is to host the global router outlet.
   */
  constructor() {}
}
