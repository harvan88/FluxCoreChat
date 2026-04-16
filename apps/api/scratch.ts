import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const audits = await prisma.fluxCoreActionAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    console.log(JSON.stringify(audits, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
