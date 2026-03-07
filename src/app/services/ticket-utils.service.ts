import { Injectable } from '@angular/core';
import { TicketStatus, TicketPriority } from '../models/ticket.model';
import { GroupLevel } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class TicketUtilsService {
  statusSeverity(s: TicketStatus): 'warn' | 'info' | 'secondary' | 'success' {
    const map: Record<TicketStatus, 'warn' | 'info' | 'secondary' | 'success'> = {
      Pendiente: 'warn',
      'En progreso': 'info',
      Revisión: 'secondary',
      Finalizado: 'success',
    };
    return map[s];
  }

  prioritySeverity(p: TicketPriority): 'secondary' | 'success' | 'warn' | 'danger' {
    const map: Record<TicketPriority, 'secondary' | 'success' | 'warn' | 'danger'> = {
      Baja: 'secondary',
      Media: 'success',
      Alta: 'warn',
      Crítica: 'danger',
    };
    return map[p];
  }

  priorityIcon(p: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      Baja: 'pi pi-arrow-down',
      Media: 'pi pi-minus',
      Alta: 'pi pi-arrow-up',
      Crítica: 'pi pi-exclamation-triangle',
    };
    return map[p];
  }

  levelSeverity(nivel: GroupLevel): 'success' | 'info' | 'warn' | 'danger' {
    const map: Record<GroupLevel, 'success' | 'info' | 'warn' | 'danger'> = {
      Junior: 'info',
      Mid: 'success',
      Senior: 'warn',
      Lead: 'danger',
    };
    return map[nivel];
  }

  readonly chartColors = {
    bg: ['#f59e0b', '#6366f1', '#8b5cf6', '#22c55e'],
    hover: ['#fbbf24', '#818cf8', '#a78bfa', '#4ade80'],
  };

  buildChartData(pendiente: number, enProgreso: number, revision: number, finalizado: number) {
    return {
      labels: ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'],
      datasets: [
        {
          data: [pendiente, enProgreso, revision, finalizado],
          backgroundColor: this.chartColors.bg,
          hoverBackgroundColor: this.chartColors.hover,
          borderWidth: 0,
        },
      ],
    };
  }

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#e2e8f0', padding: 16, font: { size: 13 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: number }) => ` ${ctx.label}: ${ctx.raw} tickets`,
        },
      },
    },
  };
}
