import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import {
    Ticket, TicketStatus, TicketPriority, TicketComment, TicketHistoryEntry,
    STATUS_FROM_API, STATUS_TO_API, PRIORITY_FROM_API, PRIORITY_TO_API,
    ApiTicketStatus, ApiTicketPriority,
} from '../models/ticket.model';
import { ApiResponse } from '../models/user.model';
import { environment } from '../../environments/environment';

export interface TicketFilters {
    status?:   string;
    priority?: string;
    group_id?: string;
    page?:     number;
    limit?:    number;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
    private readonly http   = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    // ── Estado reactivo local ──────────────────────────────────────────────────
    private readonly _tickets = signal<Ticket[]>([]);
    readonly tickets = this._tickets.asReadonly();

    readonly statuses:   TicketStatus[]   = ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'];
    readonly priorities: TicketPriority[] = ['极低', '低', '常规', '中', '高', '紧急', '严重'];

    readonly statsCount = computed(() => ({
        total:      this._tickets().length,
        pendiente:  this._tickets().filter(t => t.status === 'Pendiente').length,
        enProgreso: this._tickets().filter(t => t.status === 'En progreso').length,
        revision:   this._tickets().filter(t => t.status === 'Revisión').length,
        finalizado: this._tickets().filter(t => t.status === 'Finalizado').length,
    }));

    readonly ticketsByStatus = computed(() => {
        const map: Record<TicketStatus, Ticket[]> = {
            Pendiente: [], 'En progreso': [], Revisión: [], Finalizado: [],
        };
        this._tickets().forEach(t => map[t.status]?.push(t));
        return map;
    });

    // ── Queries ────────────────────────────────────────────────────────────────

    getTickets(filters?: TicketFilters): Observable<ApiResponse<Ticket[]>> {
        let params = new HttpParams();
        if (filters?.status)   params = params.set('status',   filters.status);
        if (filters?.priority) params = params.set('priority', filters.priority);
        if (filters?.group_id) params = params.set('group_id', filters.group_id);
        if (filters?.page)     params = params.set('page',     filters.page);
        if (filters?.limit)    params = params.set('limit',    filters.limit);

        return this.http.get<any>(`${this.apiUrl}/api/tickets`, { params }).pipe(
            map(response => {
                const rawList = Array.isArray(response) ? response
                    : (response.data ?? response.items ?? response.tickets ?? []);
                const tickets = rawList.map((dto: any) => this._mapFromApi(dto));
                this._tickets.set(tickets);
                return { success: true, message: 'OK', data: tickets } as ApiResponse<Ticket[]>;
            })
        );
    }

    getTicket(id: string): Observable<Ticket> {
        return this.http.get<any>(`${this.apiUrl}/api/tickets/${id}`).pipe(
            map(dto => this._mapFromApi(dto))
        );
    }

    createTicket(data: Partial<Ticket>): Observable<Ticket> {
        return this.http.post<any>(`${this.apiUrl}/api/tickets`, this._mapToApi(data)).pipe(
            map(dto => this._mapFromApi(dto)),
            tap(ticket => this._tickets.update(list => [ticket, ...list]))
        );
    }

    updateTicket(id: string, data: Partial<Ticket>): Observable<Ticket> {
        return this.http.patch<any>(`${this.apiUrl}/api/tickets/${id}`, this._mapToApi(data)).pipe(
            map(dto => this._mapFromApi(dto)),
            tap(ticket => this._tickets.update(list => list.map(t => t.id === id ? ticket : t)))
        );
    }

    deleteTicket(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/api/tickets/${id}`).pipe(
            tap(() => this._tickets.update(list => list.filter(t => t.id !== id)))
        );
    }

    getComments(ticketId: string): Observable<TicketComment[]> {
        return this.http.get<any[]>(`${this.apiUrl}/api/tickets/${ticketId}/comments`).pipe(
            map(dtos => dtos.map(d => this._mapComment(d)))
        );
    }

    addComment(ticketId: string, content: string): Observable<TicketComment> {
        return this.http.post<any>(
            `${this.apiUrl}/api/tickets/${ticketId}/comments`, { content }
        ).pipe(
            map(dto => this._mapComment(dto)),
            tap(comment => {
                this._tickets.update(list => list.map(t =>
                    t.id === ticketId
                        ? { ...t, comments: [...t.comments, comment] }
                        : t
                ));
            })
        );
    }

    deleteComment(ticketId: string, commentId: string): Observable<void> {
        return this.http.delete<void>(
            `${this.apiUrl}/api/tickets/${ticketId}/comments/${commentId}`
        ).pipe(
            tap(() => {
                this._tickets.update(list => list.map(t =>
                    t.id === ticketId
                        ? { ...t, comments: t.comments.filter(c => c.id !== commentId) }
                        : t
                ));
            })
        );
    }

    // ── Helpers síncronos (usan señal local) ───────────────────────────────────

    getByGroup(groupId: string): Ticket[] {
        return this._tickets().filter(t => t.groupId === groupId);
    }

    getByGroupAndStatus(groupId: string): Record<TicketStatus, Ticket[]> {
        const map: Record<TicketStatus, Ticket[]> = {
            Pendiente: [], 'En progreso': [], Revisión: [], Finalizado: [],
        };
        this.getByGroup(groupId).forEach(t => { if (map[t.status]) map[t.status].push(t); });
        return map;
    }

    getById(id: string): Ticket | undefined {
        return this._tickets().find(t => t.id === id);
    }

    /** Alias para compatibilidad (redirige a createTicket) */
    create(data: Omit<Ticket, 'id' | 'history' | 'comments'>): Observable<Ticket> {
        return this.createTicket(data);
    }

    /** Alias para compatibilidad (redirige a updateTicket) */
    update(id: string, changes: Partial<Omit<Ticket, 'id' | 'history'>>, _updatedBy: string): Observable<Ticket> {
        return this.updateTicket(id, changes);
    }

    /** Alias para compatibilidad (redirige a deleteTicket) */
    remove(id: string): Observable<void> {
        return this.deleteTicket(id);
    }

    /** Cambia solo el status via HTTP y actualiza el signal */
    updateStatus(id: string, newStatus: TicketStatus, _changedBy: string): Observable<Ticket> {
        return this.updateTicket(id, { status: newStatus });
    }

    // ── Mapeo API ↔ UI ─────────────────────────────────────────────────────────

    private _mapFromApi(dto: any): Ticket {
        return {
            id:           dto.id,
            titulo:       dto.title       ?? dto.titulo       ?? '',
            descripcion:  dto.description ?? dto.descripcion  ?? '',
            status:       STATUS_FROM_API[dto.status as ApiTicketStatus] ?? 'Pendiente',
            priority:     PRIORITY_FROM_API[dto.priority as ApiTicketPriority] ?? '中',
            assignedTo:   dto.assignee_id ?? dto.assignedTo   ?? '',
            assignedName: dto.assignee?.name ?? dto.assignedName ?? '',
            groupId:      dto.group_id    ?? dto.groupId      ?? '',
            groupName:    dto.group?.name ?? dto.groupName    ?? '',
            createdAt:    new Date(dto.created_at ?? dto.createdAt ?? Date.now()),
            dueDate:      dto.due_date || dto.dueDate
                          ? new Date(dto.due_date ?? dto.dueDate)
                          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            comments:     (dto.comments ?? []).map((c: any) => this._mapComment(c)),
            history:      (dto.history  ?? []).map((h: any) => this._mapHistory(h)),
            creatorId:    dto.creator_id ?? dto.creatorId,
        };
    }

    private _mapToApi(ticket: Partial<Ticket>): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        if (ticket.titulo      !== undefined) out['title']       = ticket.titulo;
        if (ticket.descripcion !== undefined) out['description'] = ticket.descripcion;
        if (ticket.status      !== undefined) out['status']      = STATUS_TO_API[ticket.status];
        if (ticket.priority    !== undefined) out['priority']    = PRIORITY_TO_API[ticket.priority] ?? 'medium';
        if (ticket.assignedTo  !== undefined) out['assignee_id'] = ticket.assignedTo || null;
        if (ticket.groupId     !== undefined) out['group_id']    = ticket.groupId    || null;
        if (ticket.dueDate     !== undefined) out['due_date']    = ticket.dueDate?.toISOString();
        return out;
    }

    private _mapComment(dto: any): TicketComment {
        return {
            id:        dto.id,
            author:    dto.author?.name ?? dto.author ?? '',
            author_id: dto.author_id ?? dto.author?.id,
            text:      dto.content ?? dto.text ?? '',
            date:      new Date(dto.created_at ?? dto.date ?? Date.now()),
        };
    }

    private _mapHistory(dto: any): TicketHistoryEntry {
        return {
            id:        dto.id,
            field:     dto.field_changed ?? dto.field ?? '',
            oldValue:  dto.old_value     ?? dto.oldValue ?? '',
            newValue:  dto.new_value     ?? dto.newValue ?? '',
            changedBy: dto.changed_by    ?? dto.changedBy ?? '',
            date:      new Date(dto.changed_at ?? dto.date ?? Date.now()),
        };
    }
}
