import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule],
  template: `
    <p-toast position="top-right" [breakpoints]="{'768px': {width: '100%', right: '0', left: '0', top: '0'}}" />
    <router-outlet />
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `],
})
export class App { }
