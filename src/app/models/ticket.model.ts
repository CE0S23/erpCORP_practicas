export type TicketStatus = 'Pendiente' | 'En progreso' | 'Revisión' | 'Finalizado';
export type TicketPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface TicketComment {
    id: string;
    author: string;
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
    assignedTo: string;       // member id
    assignedName: string;     // display name
    groupId: string;
    groupName: string;
    createdAt: Date;
    dueDate: Date;
    comments: TicketComment[];
    history: TicketHistoryEntry[];
}
