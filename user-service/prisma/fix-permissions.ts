/**
 * fix-permissions.ts
 *
 * Ensures the permissions and role_permissions tables are correctly populated.
 * All permission keys match:
 *   - AppPermission enum in src/app/models/role.model.ts
 *   - PERMISSION_MAP in api-gateway/src/routes/proxy.js
 *
 * Run:  npx ts-node -P tsconfig.build.json prisma/fix-permissions.ts
 */

import { PrismaClient, AppRole } from '@prisma/client';

const prisma = new PrismaClient();

// ── All permission keys ───────────────────────────────────────────────────────
const ALL_PERMISSIONS: Array<{ key: string; description: string }> = [
  // Tickets
  { key: 'view_tickets',   description: 'Ver tickets' },
  { key: 'create_tickets', description: 'Crear tickets' },
  { key: 'edit_tickets',   description: 'Editar tickets' },
  { key: 'delete_tickets', description: 'Eliminar tickets' },
  // Groups
  { key: 'view_groups',    description: 'Ver grupos' },
  { key: 'create_groups',  description: 'Crear grupos' },
  { key: 'edit_groups',    description: 'Editar grupos' },
  { key: 'delete_groups',  description: 'Eliminar grupos' },
  // Users
  { key: 'view_users',     description: 'Ver usuarios' },
  { key: 'create_users',   description: 'Crear usuarios' },
  { key: 'edit_user',      description: 'Editar usuarios' },
  { key: 'delete_users',   description: 'Eliminar usuarios' },
];

// ── Permissions per role ──────────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  superAdmin: ALL_PERMISSIONS.map(p => p.key),
  admin: [
    'view_tickets', 'create_tickets', 'edit_tickets', 'delete_tickets',
    'view_groups',  'create_groups',  'edit_groups',  'delete_groups',
    'view_users',   'create_users',   'edit_user',    'delete_users',
  ],
  medium: [
    'view_tickets', 'create_tickets', 'edit_tickets',
    'view_groups',  'create_groups',  'edit_groups',
  ],
  user: [
    'view_tickets',
    'view_groups',
  ],
};

async function main() {
  console.log('\n================================');
  console.log(' FIX: Permissions & Role Mapping');
  console.log('================================\n');

  // ── 1. Upsert all permissions ───────────────────────────────────────────────
  console.log('1. Upserting permissions...');
  const permMap: Record<string, string> = {};

  for (const p of ALL_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where:  { key: p.key },
      create: { key: p.key, description: p.description },
      update: { description: p.description },
    });
    permMap[p.key] = perm.id;
    console.log(`  [perm] ${p.key}`);
  }

  // ── 2. Assign permissions to each role ──────────────────────────────────────
  console.log('\n2. Assigning permissions to roles...');

  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS) as [AppRole, string[]][]) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`  [warn] Role "${roleName}" not found — skipping`);
      continue;
    }

    // Remove existing role_permissions for this role and re-create them
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const key of keys) {
      const permId = permMap[key];
      if (!permId) { console.warn(`  [warn] Permission "${key}" not in map`); continue; }

      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permId },
      });
    }

    console.log(`  [role] ${roleName} → ${keys.length} permissions`);
  }

  console.log('\n================================');
  console.log(' Done! Role permissions are set.');
  console.log('================================\n');
  console.log('All users must log out and log back in to get updated JWT tokens.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
