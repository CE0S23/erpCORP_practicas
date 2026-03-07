import { Component, Input, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { APP_PATHS } from '../../app.paths';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.css',
})
export class Sidebar {
    @Input() version = '1.0.0';

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    collapsed = false;

    readonly paths = APP_PATHS;

    readonly searchTerm = signal('');

    readonly navItems = [
        { label: 'Dashboard', icon: 'pi pi-chart-bar', route: APP_PATHS.dashboard },
        { label: 'Tickets', icon: 'pi pi-ticket', route: APP_PATHS.tickets },
        { label: 'Grupos', icon: 'pi pi-users', route: APP_PATHS.group },
        { label: 'Usuarios', icon: 'pi pi-user', route: APP_PATHS.usuarios },
        { label: 'Mi Perfil', icon: 'pi pi-id-card', route: APP_PATHS.perfil },
    ];

    readonly filteredNavItems = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        if (!term) return this.navItems;
        return this.navItems.filter(item => item.label.toLowerCase().includes(term));
    });

    /** true cuando estamos en una sub-ruta de /home (group, user, etc.) */
    get isInsideHome(): boolean {
        const url = this.router.url;
        return url.startsWith('/home/');
    }

    toggle(): void {
        this.collapsed = !this.collapsed;
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate([APP_PATHS.login]);
    }
}
