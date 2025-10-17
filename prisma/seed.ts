import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Need to import bcrypt

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Clear existing data (in reverse order of dependency)
  await prisma.battle.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.pokemon.deleteMany();
  await prisma.team.deleteMany();
  await prisma.league.deleteMany();
  await prisma.user.deleteMany();

  // Create a default user to be the creator of the leagues
  const hashedPassword = await bcrypt.hash('password123', 10); // Hash a default password
  const defaultUser = await prisma.user.create({
    data: {
      email: 'creator@example.com',
      password: hashedPassword,
    },
  });
  console.log(`Created default user: ${defaultUser.email} (ID: ${defaultUser.id})`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });