// ── Niveles de grupo ───────────────────────────────────────────────────────────
/** Valores de UI */
export type GroupLevel = 'Junior' | 'Mid' | 'Senior' | 'Lead';

/** Valores del backend (fuente de verdad) */
export type ApiGroupLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Mapeo: nivel backend → nivel UI */
export const LEVEL_FROM_API: Record<ApiGroupLevel, GroupLevel> = {
    beginner:     'Junior',
    intermediate: 'Mid',
    advanced:     'Senior',
    expert:       'Lead',
};

/** Mapeo: nivel UI → nivel backend */
export const LEVEL_TO_API: Record<GroupLevel, ApiGroupLevel> = {
    Junior: 'beginner',
    Mid:    'intermediate',
    Senior: 'advanced',
    Lead:   'expert',
};

// ── Categoría de grupo (modelo del backend) ────────────────────────────────────
export interface GroupCategory {
    id: string;
    name: string;
    color?: string;
}

// ── Miembro de grupo ───────────────────────────────────────────────────────────
export interface GroupMember {
    id: string;
    username: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'user';
}

// ── Grupo ──────────────────────────────────────────────────────────────────────
export interface Group {
    id: string;
    nombre: string;
    categoria: string;      // nombre de la categoría (display)
    categoriaId?: string;   // id de la categoría (API)
    nivel: GroupLevel;
    autor: string;
    miembros: number;
    tickets: number;
    memberList: GroupMember[];
    description?: string;
    isActive?: boolean;
}
