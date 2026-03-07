import { Component, inject, computed, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TicketService } from '../../services/ticket.service';
import { TicketUtilsService } from '../../services/ticket-utils.service';
import { AuthService } from '../../services/auth.service';
import { TicketStatus, TicketPriority } from '../../models/ticket.model';
import { APP_PATHS } from '../../app.paths';

@Component({
    selector: 'app-home',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, RouterLink, ChartModule, TableModule, TagModule, ToastModule, ButtonModule, TooltipModule],
    templateUrl: './home.html',
    styleUrl: './home.css',
})
export class Home implements OnInit {
    private readonly ticketService = inject(TicketService);
    private readonly authService = inject(AuthService);
    private readonly messageService = inject(MessageService);
    readonly utils = inject(TicketUtilsService);
    private readonly platformId = inject(PLATFORM_ID);

    readonly paths = APP_PATHS;
    readonly stats = this.ticketService.statsCount;
    readonly isBrowser = isPlatformBrowser(this.platformId);

    chartData: Record<string, unknown> = {};
    readonly chartOptions = this.utils.chartOptions;

    readonly recentTickets = computed(() =>
        [...this.ticketService.tickets()]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5)
    );

    ngOnInit(): void {
        if (this.isBrowser) {
            const s = this.stats();
            this.chartData = this.utils.buildChartData(s.pendiente, s.enProgreso, s.revision, s.finalizado);
        }

        const user = this.authService.currentUser;
        if (user) {
            this.messageService.add({
                severity: 'success',
                summary: `¡Bienvenido, ${user.name}!`,
                detail: `Sesión activa como ${user.role}`,
                life: 3000,
            });
        }
    }

    statusSeverity(s: TicketStatus) { return this.utils.statusSeverity(s); }
    prioritySeverity(p: TicketPriority) { return this.utils.prioritySeverity(p); }
}
