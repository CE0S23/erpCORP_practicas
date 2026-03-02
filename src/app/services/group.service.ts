import { Injectable, signal } from '@angular/core';
import { Group, GroupCategory, GroupLevel } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class GroupService {
    private readonly _groups = signal<Group[]>([
        { id: '1', nombre: 'Alpha Team', categoria: 'Desarrollo', nivel: 'Senior', autor: 'Admin ERP', miembros: 8, tickets: 14 },
        { id: '2', nombre: 'Design Hub', categoria: 'Diseño', nivel: 'Mid', autor: 'César Ramírez', miembros: 4, tickets: 6 },
        { id: '3', nombre: 'Support Core', categoria: 'Soporte', nivel: 'Junior', autor: 'Admin ERP', miembros: 12, tickets: 30 },
    ]);

    readonly groups = this._groups.asReadonly();

    create(group: Omit<Group, 'id'>): void {
        const id = Date.now().toString();
        this._groups.update(list => [...list, { ...group, id }]);
    }

    update(id: string, changes: Partial<Omit<Group, 'id'>>): void {
        this._groups.update(list =>
            list.map(g => (g.id === id ? { ...g, ...changes } : g))
        );
    }

    remove(id: string): void {
        this._groups.update(list => list.filter(g => g.id !== id));
    }

    readonly categories: GroupCategory[] = ['Desarrollo', 'Diseño', 'Marketing', 'Soporte', 'Operaciones'];
    readonly levels: GroupLevel[] = ['Junior', 'Mid', 'Senior', 'Lead'];
}
