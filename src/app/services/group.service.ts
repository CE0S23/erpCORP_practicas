import { Injectable, signal } from '@angular/core';
import { Group, GroupCategory, GroupLevel, GroupMember } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class GroupService {
    private readonly _groups = signal<Group[]>([
        {
            id: '1',
            nombre: 'Alpha Team',
            categoria: 'Desarrollo',
            nivel: 'Senior',
            autor: 'Admin ERP',
            miembros: 3,
            tickets: 14,
            memberList: [
                { id: 'u1', username: 'juan_dev', name: 'Juan Developer', email: 'juan@erp.com', role: 'user' },
                { id: 'u2', username: 'ana_dev', name: 'Ana Frontend', email: 'ana@erp.com', role: 'user' },
                { id: 'u3', username: 'admin_erp', name: 'Admin ERP', email: 'admin@erp.com', role: 'admin' },
            ],
        },
        {
            id: '2',
            nombre: 'Design Hub',
            categoria: 'Diseño',
            nivel: 'Mid',
            autor: 'César Ramírez',
            miembros: 2,
            tickets: 6,
            memberList: [
                { id: 'u4', username: 'maria_ux', name: 'María UX', email: 'maria@erp.com', role: 'user' },
                { id: 'u5', username: 'pedro_ui', name: 'Pedro UI', email: 'pedro@erp.com', role: 'user' },
            ],
        },
        {
            id: '3',
            nombre: 'Support Core',
            categoria: 'Soporte',
            nivel: 'Junior',
            autor: 'Admin ERP',
            miembros: 3,
            tickets: 30,
            memberList: [
                { id: 'u6', username: 'luis_support', name: 'Luis Soporte', email: 'luis@erp.com', role: 'user' },
                { id: 'u7', username: 'carla_ops', name: 'Carla Ops', email: 'carla@erp.com', role: 'user' },
                { id: 'u8', username: 'jorge_help', name: 'Jorge Helpdesk', email: 'jorge@erp.com', role: 'user' },
            ],
        },
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

    /** Retorna miembros de un grupo específico */
    getMembersByGroupId(groupId: string): GroupMember[] {
        return this._groups().find(g => g.id === groupId)?.memberList ?? [];
    }

    /** Verifica si un usuario pertenece al grupo indicado */
    isMemberOfGroup(userId: string, groupId: string): boolean {
        return this.getMembersByGroupId(groupId).some(m => m.id === userId);
    }

    addMember(groupId: string, member: Omit<GroupMember, 'id'>): void {
        const id = `u${Date.now()}`;
        const newMember: GroupMember = { ...member, id };
        this._groups.update(list =>
            list.map(g =>
                g.id === groupId
                    ? { ...g, memberList: [...g.memberList, newMember], miembros: g.miembros + 1 }
                    : g
            )
        );
    }

    removeMember(groupId: string, memberId: string): void {
        this._groups.update(list =>
            list.map(g =>
                g.id === groupId
                    ? {
                          ...g,
                          memberList: g.memberList.filter(m => m.id !== memberId),
                          miembros: Math.max(0, g.miembros - 1),
                      }
                    : g
            )
        );
    }

    readonly categories: GroupCategory[] = ['Desarrollo', 'Diseño', 'Marketing', 'Soporte', 'Operaciones'];
    readonly levels: GroupLevel[] = ['Junior', 'Mid', 'Senior', 'Lead'];
}
