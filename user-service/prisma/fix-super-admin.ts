/**
 * One-shot script: ensures super@erp.com has the superAdmin role.
 * Run with: npx ts-node -P tsconfig.build.json prisma/fix-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Find the superAdmin role
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'superAdmin' } });
  if (!superAdminRole) {
    console.error('ERROR: superAdmin role not found in database. Run the seed first.');
    process.exit(1);
  }
  console.log(`superAdmin role id: ${superAdminRole.id}`);

  // 2. Find super@erp.com
  const user = await prisma.user.findUnique({ where: { email: 'super@erp.com' } });
  if (!user) {
    console.error('ERROR: super@erp.com not found in database.');
    process.exit(1);
  }
  console.log(`Found user: ${user.id} (${user.email})`);

  // 3. Replace all roles with superAdmin
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({
    data: { userId: user.id, roleId: superAdminRole.id },
  });

  console.log('Done: super@erp.com is now superAdmin.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
