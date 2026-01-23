import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function key() {
  return crypto.randomBytes(12).toString('hex');
}

async function main() {
  const merchants = [
    { name: 'CleanPro', contactName: 'Alice', phone: '021-000-0001', wechat: 'cleanpro_nz', email: 'alice@cleanpro.test' },
    { name: 'Sparkle Team', contactName: 'Ben', phone: '021-000-0002', wechat: 'sparkle_team', email: 'ben@sparkle.test' },
    { name: 'HandyWorks', contactName: 'Chris', phone: '021-000-0003', wechat: 'handyworks', email: 'chris@handyworks.test' },
  ];

  const created = [];
  for (const m of merchants) {
    const dashboardKey = key();
    const row = await prisma.merchant.create({
      data: {
        name: m.name,
        contactName: m.contactName,
        phone: m.phone,
        wechat: m.wechat,
        email: m.email,
        dashboardKey,
        isActive: true,
      },
    });
    created.push(row);
  }

  console.log(`✅ Seeded ${created.length} merchants.`);
  for (const m of created) {
    console.log(`- ${m.name}: /service-booking/merchant?key=${m.dashboardKey}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

