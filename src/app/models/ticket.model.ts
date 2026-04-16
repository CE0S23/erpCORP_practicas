// ── Tipos para UI (valores mostrados al usuario) ───────────────────────────────
export type TicketStatus   = 'Pendiente' | 'En progreso' | 'Revisión' | 'Finalizado';
export type TicketPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

// ── Tipos del backend (fuente de verdad API) ───────────────────────────────────
export type ApiTicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
export type ApiTicketPriority = 'low' | 'medium' | 'high' | 'critical';

/** Mapeo: estado backend → estado UI */
export const STATUS_FROM_API: Record<ApiTicketStatus, TicketStatus> = {
    open:        'Pendiente',
    in_progress: 'En progreso',
    resolved:    'Revisión',
    closed:      'Finalizado',
    cancelled:   'Finalizado',
};

/** Mapeo: estado UI → estado backend */
export const STATUS_TO_API: Record<TicketStatus, ApiTicketStatus> = {
    'Pendiente':   'open',
    'En progreso': 'in_progress',
    'Revisión':    'resolved',
    'Finalizado':  'closed',
};

/** Mapeo: prioridad backend → prioridad UI */
export const PRIORITY_FROM_API: Record<ApiTicketPriority, TicketPriority> = {
    low:      'Baja',
    medium:   'Media',
    high:     'Alta',
    critical: 'Crítica',
};

/** Mapeo: prioridad UI → prioridad backend */
export const PRIORITY_TO_API: Record<TicketPriority, ApiTicketPriority> = {
    'Baja':    'low',
    'Media':   'medium',
    'Alta':    'high',
    'Crítica': 'critical',
};

export interface TicketComment {
    id: string;
    author: string;
    author_id?: string;
    text: string;
    date: Date;
}

export interface TicketHistoryEntry {
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    date: Date;
}

export interface Ticket {
    id: string;
    titulo: string;
    descripcion: string;
    status: TicketStatus;
    priority: TicketPriority;
    assignedTo: string;       // user id
    assignedName: string;     // display name
    groupId: string;
    groupName: string;
    createdAt: Date;
    dueDate: Date;
    comments: TicketComment[];
    history: TicketHistoryEntry[];
    creatorId?: string;
}
