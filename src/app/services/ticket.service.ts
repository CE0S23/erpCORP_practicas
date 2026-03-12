import { Injectable, signal, computed, inject } from '@angular/core';
import { Ticket, TicketStatus, TicketPriority, TicketHistoryEntry } from '../models/ticket.model';
import { GroupService } from './group.service';

@Injectable({ providedIn: 'root' })
export class TicketService {
    private readonly groupService = inject(GroupService);

    private readonly _tickets = signal<Ticket[]>([
        {
            id: 't1',
            titulo: 'Configurar pipeline de CI/CD para rama main',
            descripcion: 'Implementar GitHub Actions para ejecutar tests y deploy automático al hacer merge a main. Incluir lint checks y coverage.',
            status: 'En progreso',
            priority: '高',
            assignedTo: 'u1',
            assignedName: 'Juan Developer',
            groupId: '1',
            groupName: 'Alpha Team',
            createdAt: new Date('2026-02-20T10:00:00'),
            dueDate: new Date('2026-03-10T18:00:00'),
            comments: [
                { id: 'c1', author: 'Ana Frontend', text: 'Ya tengo el workflow base, lo comparto mañana.', date: new Date('2026-02-21T09:30:00') },
            ],
            history: [
                { id: 'h1', field: 'status', oldValue: 'Pendiente', newValue: 'En progreso', changedBy: 'Juan Developer', date: new Date('2026-02-22T14:00:00') },
            ],
        },
        {
            id: 't2',
            titulo: 'Refactorizar módulo de autenticación a signals',
            descripcion: 'Migrar el AuthService de BehaviorSubject a signal() para consistencia con el resto del proyecto.',
            status: 'Pendiente',
            priority: '中',
            assignedTo: 'u2',
            assignedName: 'Ana Frontend',
            groupId: '1',
            groupName: 'Alpha Team',
            createdAt: new Date('2026-02-25T11:00:00'),
            dueDate: new Date('2026-03-15T18:00:00'),
            comments: [],
            history: [],
        },
        {
            id: 't3',
            titulo: 'Optimizar queries de base de datos',
            descripcion: 'Las consultas de listado de grupos tardan más de 2s. Agregar índices y revisar N+1 queries en el ORM.',
            status: 'Revisión',
            priority: '严重',
            assignedTo: 'u3',
            assignedName: 'Admin ERP',
            groupId: '1',
            groupName: 'Alpha Team',
            createdAt: new Date('2026-02-18T08:00:00'),
            dueDate: new Date('2026-03-05T18:00:00'),
            comments: [
                { id: 'c2', author: 'Admin ERP', text: 'Agregué índice en group_id. Mejora del 60%.', date: new Date('2026-02-28T16:00:00') },
            ],
            history: [
                { id: 'h2', field: 'status', oldValue: 'En progreso', newValue: 'Revisión', changedBy: 'Admin ERP', date: new Date('2026-03-01T10:00:00') },
                { id: 'h3', field: 'priority', oldValue: '高', newValue: '严重', changedBy: 'Admin ERP', date: new Date('2026-02-20T09:00:00') },
            ],
        },
        {
            id: 't4',
            titulo: 'Actualizar paleta de colores del sistema de diseño',
            descripcion: 'Cambiar colores primarios según nuevas guías de marca. Aplicar en todos los componentes PrimeNG.',
            status: 'Finalizado',
            priority: '低',
            assignedTo: 'u4',
            assignedName: 'María UX',
            groupId: '2',
            groupName: 'Design Hub',
            createdAt: new Date('2026-02-10T09:00:00'),
            dueDate: new Date('2026-02-20T18:00:00'),
            comments: [],
            history: [
                { id: 'h4', field: 'status', oldValue: 'En progreso', newValue: 'Finalizado', changedBy: 'María UX', date: new Date('2026-02-19T17:00:00') },
            ],
        },
        {
            id: 't5',
            titulo: 'Crear wireframes para módulo de reportes',
            descripcion: 'Diseñar flows de UX y wireframes de alta fidelidad para el módulo de reportes usando Figma.',
            status: 'En progreso',
            priority: '中',
            assignedTo: 'u5',
            assignedName: 'Pedro UI',
            groupId: '2',
            groupName: 'Design Hub',
            createdAt: new Date('2026-02-28T10:00:00'),
            dueDate: new Date('2026-03-12T18:00:00'),
            comments: [],
            history: [],
        },
        {
            id: 't6',
            titulo: 'Resolver tickets de soporte sin respuesta (+48h)',
            descripcion: 'Hay 12 tickets sin respuesta que superan el SLA de 48 horas. Priorizar y asignar agentes disponibles.',
            status: 'Pendiente',
            priority: '严重',
            assignedTo: 'u6',
            assignedName: 'Luis Soporte',
            groupId: '3',
            groupName: 'Support Core',
            createdAt: new Date('2026-03-01T07:00:00'),
            dueDate: new Date('2026-03-06T18:00:00'),
            comments: [
                { id: 'c3', author: 'Carla Ops', text: 'La mayoría son de clientes enterprise. Se necesita escalamiento.', date: new Date('2026-03-02T08:00:00') },
            ],
            history: [],
        },
        {
            id: 't7',
            titulo: 'Documentar procedimientos de escalamiento L1→L2→L3',
            descripcion: 'Crear el manual interno de procedimientos para escalamiento con scripts de respuesta estandarizados.',
            status: 'En progreso',
            priority: '高',
            assignedTo: 'u7',
            assignedName: 'Carla Ops',
            groupId: '3',
            groupName: 'Support Core',
            createdAt: new Date('2026-02-15T10:00:00'),
            dueDate: new Date('2026-03-08T18:00:00'),
            comments: [],
            history: [],
        },
        {
            id: 't8',
            titulo: 'Implementar chat de soporte en tiempo real',
            descripcion: 'Integrar WebSocket para soporte en tiempo real con los clientes desde el panel de agentes.',
            status: 'Revisión',
            priority: '高',
            assignedTo: 'u8',
            assignedName: 'Jorge Helpdesk',
            groupId: '3',
            groupName: 'Support Core',
            createdAt: new Date('2026-02-05T09:00:00'),
            dueDate: new Date('2026-03-20T18:00:00'),
            comments: [],
            history: [
                { id: 'h5', field: 'status', oldValue: 'En progreso', newValue: 'Revisión', changedBy: 'Jorge Helpdesk', date: new Date('2026-03-03T11:00:00') },
            ],
        },
    ]);

    readonly tickets = this._tickets.asReadonly();

    readonly statuses: TicketStatus[] = ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'];
    readonly priorities: TicketPriority[] = ['极低', '低', '常规', '中', '高', '紧急', '严重'];

    readonly statsCount = computed(() => ({
        total: this._tickets().length,
        pendiente: this._tickets().filter(t => t.status === 'Pendiente').length,
        enProgreso: this._tickets().filter(t => t.status === 'En progreso').length,
        revision: this._tickets().filter(t => t.status === 'Revisión').length,
        finalizado: this._tickets().filter(t => t.status === 'Finalizado').length,
    }));

    readonly ticketsByStatus = computed(() => {
        const map: Record<TicketStatus, Ticket[]> = {
            Pendiente: [],
            'En progreso': [],
            Revisión: [],
            Finalizado: [],
        };
        this._tickets().forEach(t => map[t.status].push(t));
        return map;
    });

    getByGroup(groupId: string): Ticket[] {
        return this._tickets().filter(t => t.groupId === groupId);
    }

    getByGroupAndStatus(groupId: string): Record<TicketStatus, Ticket[]> {
        const map: Record<TicketStatus, Ticket[]> = {
            Pendiente: [],
            'En progreso': [],
            Revisión: [],
            Finalizado: [],
        };
        this.getByGroup(groupId).forEach(t => map[t.status].push(t));
        return map;
    }

    getById(id: string): Ticket | undefined {
        return this._tickets().find(t => t.id === id);
    }

    create(ticket: Omit<Ticket, 'id' | 'history' | 'comments'>): void {
        const id = `t${Date.now()}`;
        this._tickets.update(list => [...list, { ...ticket, id, comments: [], history: [] }]);
    }

    /**
     * Actualiza un ticket con validación de negocio:
     * si se cambia assignedTo, el usuario debe pertenecer al grupo del ticket.
     * Lanza un Error con mensaje descriptivo si la validación falla.
     */
    update(id: string, changes: Partial<Omit<Ticket, 'id' | 'history'>>, updatedBy: string): void {
        const current = this._tickets().find(t => t.id === id);
        if (!current) return;

        const targetGroupId = changes.groupId ?? current.groupId;

        if (changes.assignedTo && changes.assignedTo !== current.assignedTo) {
            const valid = this.groupService.isMemberOfGroup(changes.assignedTo, targetGroupId);
            if (!valid) {
                throw new Error('El usuario seleccionado no pertenece al grupo del ticket.');
            }
        }

        // Construir entradas de historial automáticamente
        const historyEntries: TicketHistoryEntry[] = [];
        (Object.keys(changes) as Array<keyof typeof changes>).forEach(field => {
            const old = String(((current as unknown) as Record<string, unknown>)[field as string] ?? '');
            const next = String(changes[field] ?? '');
            if (old !== next) {
                historyEntries.push({
                    id: `h${Date.now()}_${String(field)}`,
                    field: String(field),
                    oldValue: old,
                    newValue: next,
                    changedBy: updatedBy,
                    date: new Date(),
                });
            }
        });

        this._tickets.update(list =>
            list.map(t =>
                t.id === id
                    ? { ...t, ...changes, history: [...t.history, ...historyEntries] }
                    : t
            )
        );
    }

    /** Cambia solo el status — para drag-and-drop en kanban */
    updateStatus(id: string, newStatus: TicketStatus, changedBy: string): void {
        const current = this._tickets().find(t => t.id === id);
        if (!current || current.status === newStatus) return;

        const entry: TicketHistoryEntry = {
            id: `h${Date.now()}`,
            field: 'status',
            oldValue: current.status,
            newValue: newStatus,
            changedBy,
            date: new Date(),
        };

        this._tickets.update(list =>
            list.map(t => (t.id === id ? { ...t, status: newStatus, history: [...t.history, entry] } : t))
        );
    }

    addComment(ticketId: string, author: string, text: string): void {
        this._tickets.update(list =>
            list.map(t =>
                t.id === ticketId
                    ? { ...t, comments: [...t.comments, { id: `c${Date.now()}`, author, text, date: new Date() }] }
                    : t
            )
        );
    }

    remove(id: string): void {
        this._tickets.update(list => list.filter(t => t.id !== id));
    }
}
