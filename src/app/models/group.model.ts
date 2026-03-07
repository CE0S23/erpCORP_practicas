export type GroupCategory = 'Desarrollo' | 'Diseño' | 'Marketing' | 'Soporte' | 'Operaciones';
export type GroupLevel = 'Junior' | 'Mid' | 'Senior' | 'Lead';

export interface GroupMember {
    id: string;
    username: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
}

export interface Group {
    id: string;
    nombre: string;
    categoria: GroupCategory;
    nivel: GroupLevel;
    autor: string;
    miembros: number;
    tickets: number;
    memberList: GroupMember[];
}
