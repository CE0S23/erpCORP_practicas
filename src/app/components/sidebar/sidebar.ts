import { Component, Input, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { APP_PATHS } from '../../app.paths';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { PERMISSION_LABELS, PERMISSION_ICONS } from '../../models/role.model';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, CommonModule],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.css',
})
export class Sidebar {
    @Input() version = '1.0.0';

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    readonly permissions = inject(PermissionService);

    collapsed = false;
    readonly paths = APP_PATHS;
    readonly searchTerm = signal('');
    readonly permissionLabels = PERMISSION_LABELS;
    readonly permissionIcons = PERMISSION_ICONS;

    readonly currentUser = computed(() => this.authService.currentUser);

    readonly userInitials = computed(() => {
        const name = this.authService.currentUser?.name ?? '';
        return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    });

    readonly navItems = [
        { label: 'Dashboard',  icon: 'pi pi-chart-bar', route: APP_PATHS.dashboard },
        { label: 'Tickets',    icon: 'pi pi-ticket',    route: APP_PATHS.tickets },
        { label: 'Grupos',     icon: 'pi pi-users',     route: APP_PATHS.group },
        { label: 'Usuarios',   icon: 'pi pi-user',      route: APP_PATHS.usuarios },
        { label: 'Mi Perfil',  icon: 'pi pi-id-card',   route: APP_PATHS.perfil },
    ];

    readonly filteredNavItems = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        if (!term) return this.navItems;
        return this.navItems.filter(item => item.label.toLowerCase().includes(term));
    });

    get isInsideHome(): boolean {
        return this.router.url.startsWith('/home/');
    }

    toggle(): void {
        this.collapsed = !this.collapsed;
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate([APP_PATHS.login]);
    }
}
