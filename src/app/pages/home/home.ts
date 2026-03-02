import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [ButtonModule],
    template: `
        <div class="home-page">
            <p-button label="PrimeNG OK" icon="pi pi-check-circle" severity="success" />
        </div>
    `,
    styles: [`.home-page { padding: 1rem; }`],
})
export class Home { }
