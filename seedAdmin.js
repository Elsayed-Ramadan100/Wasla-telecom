import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'owner';
  const password = 'superuser123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert the owner to guarantee creation or update with the absolute latest permissions
  const owner = await prisma.admin.upsert({
    where: { username },
    update: {
      role: 'owner',
      canViewUsers: true,
      canEditUsers: true,
      canManageBilling: true,
      canModerateUsers: true,
      canDeleteUsers: true,
      canManageOffers: true // Ensures existing owners gain this new permission automatically
    },
    create: {
      username,
      passwordHash,
      role: 'owner',
      canViewUsers: true,
      canEditUsers: true,
      canManageBilling: true,
      canModerateUsers: true,
      canDeleteUsers: true,
      canManageOffers: true
    }
  });

  console.log('Successfully provisioned Owner account with maximum privileges:');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log(owner);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
