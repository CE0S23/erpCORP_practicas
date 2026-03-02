import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { APP_PATHS } from '../../app.paths';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.css',
})
export class Sidebar {
    @Input() version = '1.0.0';

    collapsed = false;

    readonly navItems = [
        { label: 'Home', icon: 'pi pi-home', route: APP_PATHS.home },
        { label: 'Group', icon: 'pi pi-users', route: APP_PATHS.group },
        { label: 'User', icon: 'pi pi-user', route: APP_PATHS.user },
    ];

    toggle(): void {
        this.collapsed = !this.collapsed;
    }
}
