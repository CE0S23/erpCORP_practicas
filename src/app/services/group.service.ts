import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import {
    Group, GroupMember, GroupCategory, GroupLevel,
    LEVEL_FROM_API, LEVEL_TO_API, ApiGroupLevel,
} from '../models/group.model';
import { ApiResponse } from '../models/user.model';
import { environment } from '../../environments/environment';
import { SYSTEM_USERS } from './auth.service';

export interface GroupFilters {
    category_id?: string;
    level?:       string;
    is_active?:   boolean;
    page?:        number;
    limit?:       number;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
    private readonly http   = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    // ── Estado reactivo local ──────────────────────────────────────────────────
    private readonly _groups     = signal<Group[]>([]);
    private readonly _categories = signal<GroupCategory[]>([]);

    readonly groups     = this._groups.asReadonly();
    readonly categories = this._categories.asReadonly();
    readonly levels: GroupLevel[] = ['Junior', 'Mid', 'Senior', 'Lead'];

    // ── Grupos ─────────────────────────────────────────────────────────────────

    getGroups(filters?: GroupFilters): Observable<ApiResponse<Group[]>> {
        let params = new HttpParams();
        if (filters?.category_id) params = params.set('category_id', filters.category_id);
        if (filters?.level)       params = params.set('level',       filters.level);
        if (filters?.is_active != null) params = params.set('is_active', String(filters.is_active));
        if (filters?.page)        params = params.set('page',        filters.page);
        if (filters?.limit)       params = params.set('limit',       filters.limit);

        return this.http.get<any>(`${this.apiUrl}/api/groups`, { params }).pipe(
            map(response => {
                const rawList = Array.isArray(response) ? response
                    : (response.data ?? response.items ?? response.groups ?? []);
                const groups = rawList.map((dto: any) => this._mapFromApi(dto));
                this._groups.set(groups);
                return { success: true, message: 'OK', data: groups } as ApiResponse<Group[]>;
            })
        );
    }

    getGroup(id: string): Observable<Group> {
        return this.http.get<any>(`${this.apiUrl}/api/groups/${id}`).pipe(
            map(dto => this._mapFromApi(dto))
        );
    }

    createGroup(data: Partial<Group>): Observable<Group> {
        return this.http.post<any>(`${this.apiUrl}/api/groups`, this._mapToApi(data)).pipe(
            map(dto => this._mapFromApi(dto)),
            tap(group => this._groups.update(list => [...list, group]))
        );
    }

    updateGroup(id: string, data: Partial<Group>): Observable<Group> {
        return this.http.patch<any>(`${this.apiUrl}/api/groups/${id}`, this._mapToApi(data)).pipe(
            map(dto => this._mapFromApi(dto)),
            tap(group => this._groups.update(list => list.map(g => g.id === id ? group : g)))
        );
    }

    deleteGroup(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/api/groups/${id}`).pipe(
            tap(() => this._groups.update(list => list.filter(g => g.id !== id)))
        );
    }

    // ── Miembros ───────────────────────────────────────────────────────────────

    getMembers(groupId: string): Observable<GroupMember[]> {
        return this.http.get<any>(`${this.apiUrl}/api/groups/${groupId}/members`).pipe(
            map(response => {
                const rawList = Array.isArray(response) ? response : (response?.data ?? []);
                return rawList.map((d: any) => this._mapMember(d));
            })
        );
    }

    addMember(groupId: string, userId: string, role = 'member'): Observable<GroupMember> {
        return this.http.post<any>(
            `${this.apiUrl}/api/groups/${groupId}/members`, { user_id: userId, role }
        ).pipe(
            map(dto => this._mapMember(dto)),
            tap(member => {
                this._groups.update(list => list.map(g =>
                    g.id === groupId
                        ? {
                            ...g,
                            memberList: [...g.memberList, member],
                            miembros: g.miembros + 1,
                          }
                        : g
                ));
            })
        );
    }

    removeMember(groupId: string, userId: string): Observable<void> {
        return this.http.delete<void>(
            `${this.apiUrl}/api/groups/${groupId}/members/${userId}`
        ).pipe(
            tap(() => {
                this._groups.update(list => list.map(g =>
                    g.id === groupId
                        ? {
                            ...g,
                            memberList: g.memberList.filter(m => m.id !== userId),
                            miembros: Math.max(0, g.miembros - 1),
                          }
                        : g
                ));
            })
        );
    }

    updateMemberRole(groupId: string, userId: string, role: string): Observable<GroupMember> {
        return this.http.patch<any>(
            `${this.apiUrl}/api/groups/${groupId}/members/${userId}`, { role }
        ).pipe(
            map(dto => this._mapMember(dto)),
            tap(updated => {
                this._groups.update(list => list.map(g =>
                    g.id === groupId
                        ? { ...g, memberList: g.memberList.map(m => m.id === userId ? updated : m) }
                        : g
                ));
            })
        );
    }

    // ── Categorías ─────────────────────────────────────────────────────────────

    getCategories(): Observable<GroupCategory[]> {
        return this.http.get<any[]>(`${this.apiUrl}/api/categories`).pipe(
            map(dtos => dtos.map(d => ({ id: d.id, name: d.name, color: d.color }))),
            tap(cats => this._categories.set(cats)),
            catchError(() => of([] as GroupCategory[]))
        );
    }

    createCategory(name: string, color: string): Observable<GroupCategory> {
        return this.http.post<any>(`${this.apiUrl}/api/categories`, { name, color }).pipe(
            map(dto => ({ id: dto.id, name: dto.name, color: dto.color })),
            tap(cat => this._categories.update(list => [...list, cat]))
        );
    }

    // ── Helpers síncronos (usan señal local) ───────────────────────────────────

    getMembersByGroupId(groupId: string): GroupMember[] {
        return this._groups().find(g => g.id === groupId)?.memberList ?? [];
    }

    isMemberOfGroup(userId: string, groupId: string): boolean {
        return this.getMembersByGroupId(groupId).some(m => m.id === userId);
    }

    /** Alias para compatibilidad con group.ts */
    create(data: Omit<Group, 'id'>): Observable<Group> {
        return this.createGroup(data);
    }

    update(id: string, changes: Partial<Omit<Group, 'id'>>): Observable<Group> {
        return this.updateGroup(id, changes);
    }

    remove(id: string): Observable<void> {
        return this.deleteGroup(id);
    }

    addMemberCompat(groupId: string, member: Omit<GroupMember, 'id'> & { id?: string }): Observable<GroupMember> {
        const userId = member.id ?? '';
        const role   = member.role === 'admin' ? 'admin' : 'member';
        if (userId) {
            return this.addMember(groupId, userId, role);
        }
        // fallback: actualización local si no hay id real
        const newMember: GroupMember = { ...member, id: `u${Date.now()}` };
        this._groups.update(list => list.map(g =>
            g.id === groupId
                ? { ...g, memberList: [...g.memberList, newMember], miembros: g.miembros + 1 }
                : g
        ));
        return of(newMember);
    }

    removeMemberCompat(groupId: string, memberId: string): Observable<void> {
        return this.removeMember(groupId, memberId);
    }

    // ── Mapeo API ↔ UI ─────────────────────────────────────────────────────────

    private _mapFromApi(dto: any): Group {
        return {
            id:          dto.id,
            nombre:      dto.name     ?? dto.nombre     ?? '',
            categoria:   dto.category?.name ?? dto.categoria ?? '',
            categoriaId: dto.category_id   ?? dto.category?.id,
            nivel:       LEVEL_FROM_API[dto.level as ApiGroupLevel] ?? (dto.nivel as GroupLevel) ?? 'Junior',
            autor:       dto.created_by?.name ?? dto.autor ?? '',
            miembros:    dto.members?.length  ?? dto.miembros  ?? 0,
            tickets:     dto.tickets_count    ?? dto.tickets    ?? 0,
            memberList:  (dto.members ?? dto.memberList ?? []).map((m: any) => this._mapMember(m)),
            description: dto.description,
            isActive:    dto.is_active ?? true,
        };
    }

    private _mapToApi(group: Partial<Group>): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        if (group.nombre      !== undefined) out['name']        = group.nombre;
        if (group.description !== undefined) out['description'] = group.description;
        if (group.categoriaId !== undefined) out['category_id'] = group.categoriaId || null;
        if (group.categoria   !== undefined && !group.categoriaId) {
            // Intenta resolver el id por nombre
            const cat = this._categories().find(c => c.name === group.categoria);
            if (cat) out['category_id'] = cat.id;
        }
        if (group.nivel !== undefined) out['level'] = LEVEL_TO_API[group.nivel] ?? 'beginner';
        return out;
    }

    private _mapMember(dto: any): GroupMember {
        const userId = dto.user_id ?? dto.id;
        const sysUser = SYSTEM_USERS().find(u => u.id === userId);
        return {
            id:       userId,
            username: dto.user?.email?.split('@')[0] ?? dto.username ?? sysUser?.username ?? '',
            name:     dto.user?.name  ?? dto.name  ?? sysUser?.name ?? 'Usuario Desconocido',
            email:    dto.user?.email ?? dto.email ?? sysUser?.email ?? '',
            role:     dto.role === 'admin' || dto.role === 'owner' ? 'admin' : 'user',
        };
    }
}
