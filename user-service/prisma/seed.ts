/**
 * Demo seed — crea los datos de presentación:
 *   • 3 usuarios con permisos distintos
 *   • 2 categorías + 2 grupos
 *   • Los 3 usuarios en ambos grupos
 *   • 1 ticket por usuario en cada grupo (6 en total)
 *
 * Ejecutar:  npx ts-node -P tsconfig.build.json prisma/seed.ts
 *
 * Es idempotente: si los registros ya existen los omite o actualiza.
 */

import { PrismaClient, AppRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Demo1234!';

// ─── Datos de los 3 usuarios demo ────────────────────────────────────────────

const DEMO_USERS = [
  { email: 'ana.garcia@erp.com',    name: 'Ana García',     role: AppRole.admin  },
  { email: 'carlos.mendez@erp.com', name: 'Carlos Méndez',  role: AppRole.medium },
  { email: 'lucia.torres@erp.com',  name: 'Lucía Torres',   role: AppRole.user   },
];

// ─── Helper: obtener el id de un rol ─────────────────────────────────────────

async function getRoleId(name: AppRole): Promise<string> {
  const role = await prisma.role.findUnique({ where: { name } });
  if (!role) throw new Error(`Rol "${name}" no encontrado. Verifica que el seed de roles ya se ejecutó.`);
  return role.id;
}

// ─── Helper: crear / actualizar usuario con su rol ───────────────────────────

async function upsertUser(data: typeof DEMO_USERS[number]) {
  const roleId       = await getRoleId(data.role);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where:  { email: data.email },
    create: { email: data.email, name: data.name, passwordHash, isActive: true },
    update: { name: data.name, isActive: true },
  });

  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({ data: { userId: user.id, roleId } });

  console.log(`  [usuario] ${user.email} → ${data.role}`);
  return user;
}

// ─── Helpers para tablas de otros servicios (raw SQL) ────────────────────────

/** Busca una categoría por nombre; la crea si no existe. */
async function findOrCreateCategory(name: string, color: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM group_categories WHERE name = ${name} LIMIT 1
  `;
  if (rows.length > 0) {
    await prisma.$executeRaw`
      UPDATE group_categories SET color = ${color} WHERE id = ${rows[0].id}::uuid
    `;
    return rows[0].id;
  }
  const created = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO group_categories (id, name, color)
    VALUES (gen_random_uuid(), ${name}, ${color})
    RETURNING id
  `;
  return created[0].id;
}

/** Busca un grupo por nombre; lo crea si no existe. */
async function findOrCreateGroup(
  name: string,
  description: string,
  categoryId: string,
  level: string,
): Promise<string> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM groups WHERE name = ${name} LIMIT 1
  `;
  if (rows.length > 0) return rows[0].id;

  const created = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO groups (id, name, description, category_id, level, is_active)
    VALUES (
      gen_random_uuid(), ${name}, ${description},
      ${categoryId}::uuid,
      ${level}::"group_level",
      true
    )
    RETURNING id
  `;
  return created[0].id;
}

/** Agrega un miembro al grupo; actualiza el rol si ya existe. */
async function addMember(
  groupId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' = 'member',
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO group_members (id, group_id, user_id, role)
    VALUES (gen_random_uuid(), ${groupId}::uuid, ${userId}::uuid, ${role}::"group_member_role")
    ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role
  `;
}

/** Crea o actualiza un ticket identificado por (title, group_id, assignee_id). */
async function upsertTicket(
  title:       string,
  description: string,
  status:      'open' | 'in_progress' | 'resolved' | 'closed',
  priority:    'low' | 'medium' | 'high' | 'critical',
  creatorId:   string,
  assigneeId:  string,
  groupId:     string,
): Promise<void> {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM tickets
    WHERE title = ${title}
      AND group_id   = ${groupId}::uuid
      AND assignee_id = ${assigneeId}::uuid
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE tickets
      SET status      = ${status}::"ticket_status",
          priority    = ${priority}::"ticket_priority",
          description = ${description}
      WHERE id = ${existing[0].id}::uuid
    `;
    console.log(`  [ticket] (actualizado) "${title}"`);
  } else {
    await prisma.$executeRaw`
      INSERT INTO tickets (id, title, description, status, priority, creator_id, assignee_id, group_id, updated_at)
      VALUES (
        gen_random_uuid(),
        ${title}, ${description},
        ${status}::"ticket_status",
        ${priority}::"ticket_priority",
        ${creatorId}::uuid,
        ${assigneeId}::uuid,
        ${groupId}::uuid,
        NOW()
      )
    `;
    console.log(`  [ticket] (nuevo)      "${title}"`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n============================');
  console.log(' SEED: Datos de demostración');
  console.log('============================\n');

  // ── 1. Usuarios ──────────────────────────────────────────────────────────────
  console.log('1. Creando usuarios...');
  const [ana, carlos, lucia] = await Promise.all(DEMO_USERS.map(upsertUser));

  // ── 2. Categorías ────────────────────────────────────────────────────────────
  console.log('\n2. Creando categorías...');
  const catTech = await findOrCreateCategory('Tecnología',  '#4f46e5');
  const catOps  = await findOrCreateCategory('Operaciones', '#0891b2');
  console.log('  [cat] Tecnología (#4f46e5), Operaciones (#0891b2)');

  // ── 3. Grupos ────────────────────────────────────────────────────────────────
  console.log('\n3. Creando grupos...');
  const grpFront = await findOrCreateGroup(
    'Desarrollo Frontend',
    'Equipo encargado del diseño e implementación de interfaces de usuario.',
    catTech,
    'intermediate',
  );
  const grpSupport = await findOrCreateGroup(
    'Soporte Técnico',
    'Equipo de atención y resolución de incidencias internas y externas.',
    catOps,
    'beginner',
  );
  console.log('  [grupo] Desarrollo Frontend, Soporte Técnico');

  // ── 4. Membresías ─────────────────────────────────────────────────────────
  console.log('\n4. Asignando miembros...');
  // Frontend: Ana=owner, Carlos=member, Lucía=member
  await addMember(grpFront, ana.id,    'owner');
  await addMember(grpFront, carlos.id, 'member');
  await addMember(grpFront, lucia.id,  'member');
  // Soporte: Carlos=owner, Ana=member, Lucía=member
  await addMember(grpSupport, carlos.id, 'owner');
  await addMember(grpSupport, ana.id,    'member');
  await addMember(grpSupport, lucia.id,  'member');
  console.log('  Los 3 usuarios asignados a ambos grupos ✓');

  // ── 5. Tickets ───────────────────────────────────────────────────────────
  console.log('\n5. Creando tickets...');

  // — Grupo: Desarrollo Frontend —
  await upsertTicket(
    'Revisar componentes de autenticación',
    'Auditar los formularios de login y registro para cumplir con los estándares de seguridad definidos.',
    'in_progress', 'high', ana.id, ana.id, grpFront,
  );
  await upsertTicket(
    'Actualizar librería de estilos',
    'Migrar de la versión actual de PrimeNG a la última estable y corregir regresiones visuales.',
    'open', 'medium', ana.id, carlos.id, grpFront,
  );
  await upsertTicket(
    'Documentar guía de onboarding',
    'Redactar la guía de incorporación para nuevos desarrolladores del equipo frontend.',
    'open', 'low', ana.id, lucia.id, grpFront,
  );

  // — Grupo: Soporte Técnico —
  await upsertTicket(
    'Resolver incidencia crítica en producción',
    'Investigar y corregir el error 500 reportado en el módulo de reportes tras el último deploy.',
    'in_progress', 'critical', carlos.id, ana.id, grpSupport,
  );
  await upsertTicket(
    'Migración de datos de clientes',
    'Ejecutar el plan de migración de registros históricos al nuevo esquema de base de datos.',
    'open', 'high', carlos.id, carlos.id, grpSupport,
  );
  await upsertTicket(
    'Reporte mensual de soporte',
    'Generar y enviar el informe mensual de incidencias resueltas y métricas del equipo.',
    'open', 'medium', carlos.id, lucia.id, grpSupport,
  );

  console.log('\n============================');
  console.log(' SEED completado exitosamente');
  console.log('============================');
  console.log('\nContraseña para todos los usuarios demo:  Demo1234!');
  console.log('  ana.garcia@erp.com      → Admin (todos los permisos de gestión)');
  console.log('  carlos.mendez@erp.com   → Editor (crear/editar tickets y grupos)');
  console.log('  lucia.torres@erp.com    → Básico (solo ver tickets y grupos)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
