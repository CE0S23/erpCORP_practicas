import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule, CardModule, DividerModule, TagModule, AvatarModule, ButtonModule, BreadcrumbModule],
    templateUrl: './perfil.html',
    styleUrl: './perfil.css',
})
export class Perfil {
    private readonly authService = inject(AuthService);
    private readonly groupService = inject(GroupService);

    readonly user = this.authService.currentUser;

    readonly userGroup = computed(() => {
        if (!this.user) return null;
        const allGroups = this.groupService.groups();
        return allGroups.find(g => g.memberList.some(m => m.id === this.user!.id)) ?? null;
    });

    readonly initials = computed(() => {
        const name = this.user?.name ?? '';
        return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    });

    readonly roleSeverity = computed((): 'danger' | 'warn' | 'success' => {
        return this.user?.role === 'admin' ? 'danger' : 'success';
    });

    readonly roleLabel = computed(() => {
        return this.user?.role === 'admin' ? 'Administrador' : 'Usuario';
    });

    readonly mockSettings = [
        { icon: 'pi pi-bell', label: 'Notificaciones', value: 'Activadas' },
        { icon: 'pi pi-moon', label: 'Tema', value: 'Oscuro' },
        { icon: 'pi pi-globe', label: 'Idioma', value: 'Español' },
        { icon: 'pi pi-shield', label: '2FA', value: 'Desactivado' },
    ];
}
