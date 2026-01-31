import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildTimeSlots(daysAhead = 21, perService = 8): string[] {
  const slots: string[] = [];
  const hours = [9, 10, 11, 13, 14, 15, 16];
  for (let i = 0; i < perService; i++) {
    const d = new Date();
    d.setDate(d.getDate() + randInt(1, daysAhead));
    d.setHours(pick(hours), 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    slots.push(`${yyyy}-${mm}-${dd} ${hh}:00`);
  }
  return Array.from(new Set(slots)).sort();
}

function newDashboardKey() {
  return crypto.randomBytes(12).toString('hex');
}

function pickRegion(): string {
  return pick(['Sydney CBD', 'Inner West', 'North Shore', 'Eastern Suburbs']);
}

function buildDeliveryDates(daysAhead = 10, count = 4): string[] {
  const dates = new Set<string>();
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + randInt(1, daysAhead));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.add(`${yyyy}-${mm}-${dd} 10:00-18:00`);
  }
  return Array.from(dates).sort();
}

async function upsertUser(params: { email: string; phone: string; password: string; role: 'USER' | 'MERCHANT' | 'ADMIN' }) {
  const passwordHash = await hashPassword(params.password);
  const existingByEmail = await prisma.user.findUnique({ where: { email: params.email } });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: { phone: params.phone, passwordHash, role: params.role },
    });
  }
  const existingByPhone = await prisma.user.findUnique({ where: { phone: params.phone } });
  if (existingByPhone) {
    return prisma.user.update({
      where: { id: existingByPhone.id },
      data: { email: params.email, passwordHash, role: params.role },
    });
  }
  return prisma.user.create({
    data: { email: params.email, phone: params.phone, passwordHash, role: params.role },
  });
}

async function main() {
  // --------------------
  // Demo accounts
  // --------------------
  const demoPassword = 'Test123456';

  const demoUser = await upsertUser({
    email: 'user@test.local',
    phone: '0220000001',
    password: demoPassword,
    role: 'USER',
  });

  const merchants = [
    {
      email: 'merchant1@test.local',
      phone: '0220000002',
      storeName: 'CleanPro',
      contactName: 'Alice',
      wechat: 'cleanpro_au',
      address: '350 George St, Sydney NSW 2000',
      openHours: 'Mon-Fri 09:00-18:00',
      description: 'Professional cleaning service in Sydney. Fast response and reliable scheduling.',
    },
    {
      email: 'merchant2@test.local',
      phone: '0220000003',
      storeName: 'Sparkle Team',
      contactName: 'Ben',
      wechat: 'sparkle_team',
      address: '1/235 Oxford St, Bondi Junction NSW 2022',
      openHours: 'Daily 10:00-19:00',
      description: 'Home & office cleaning across Sydney with flexible time slots.',
    },
    {
      email: 'merchant3@test.local',
      phone: '0220000004',
      storeName: 'HandyWorks',
      contactName: 'Chris',
      wechat: 'handyworks',
      address: '5/33-41 Euston Rd, Alexandria NSW 2015',
      openHours: 'Mon-Sat 09:00-18:00',
      description: 'Sydney handyman visits, assembly, and light repairs.',
    },
  ];

  const baseServiceNames = [
    'Home Cleaning',
    'Deep Cleaning',
    'Handyman Visit',
    'Furniture Assembly',
    'Appliance Installation',
    'Moving Help',
    'Gardening / Lawn Care',
    'AC Cleaning',
  ];
  const descTemplates = [
    'Professional service with flexible time slots.',
    'Includes standard materials. Extra requests can be noted when booking.',
    'Fast response and clear confirmation flow.',
    'Suitable for apartments and houses. Please prepare access instructions.',
  ];
  const durations = [30, 45, 60, 90, 120];

  const createdMerchants: Array<{ userEmail: string; userPhone: string; merchantId: string; storeName: string }> = [];

  for (const m of merchants) {
    const user = await upsertUser({
      email: m.email,
      phone: m.phone,
      password: demoPassword,
      role: 'MERCHANT',
    });

    // Upsert merchant profile by unique userId
    const existing = await prisma.merchant.findFirst({ where: { userId: user.id } });
    const merchant =
      existing
        ? await prisma.merchant.update({
            where: { id: existing.id },
            data: {
              name: m.storeName,
              contactName: m.contactName,
              phone: m.phone,
              wechat: m.wechat,
              email: m.email,
              address: m.address,
              openHours: m.openHours,
              description: m.description,
              isActive: true,
              userId: user.id,
            },
          })
        : await prisma.merchant.create({
            data: {
              name: m.storeName,
              contactName: m.contactName,
              phone: m.phone,
              wechat: m.wechat,
              email: m.email,
              address: m.address,
              openHours: m.openHours,
              description: m.description,
              isActive: true,
              userId: user.id,
              dashboardKey: newDashboardKey(),
            },
          });

    // Reset services for demo merchants to keep the script repeatable.
    await prisma.service.deleteMany({ where: { merchantId: merchant.id } });

    const toCreate = randInt(3, 5);
    for (let i = 0; i < toCreate; i++) {
      const name = `${pick(baseServiceNames)}${Math.random() < 0.25 ? ` (${pick(['Standard', 'Plus', 'Premium'])})` : ''}`;
      const durationMins = pick(durations);
      const price = (randInt(39 * 100, 199 * 100) / 100).toFixed(2);
      const description = `${pick(descTemplates)}\n\nEstimated duration: ${durationMins} mins.`;
      const timeSlots = buildTimeSlots(21, randInt(6, 10));

      await prisma.service.create({
        data: {
          name,
          description,
          price,
          durationMins,
          timeSlotsJson: JSON.stringify(timeSlots),
          imageUrl: null,
          isActive: true,
          sortOrder: i,
          merchantId: merchant.id,
        },
      });
    }

    createdMerchants.push({ userEmail: user.email, userPhone: user.phone, merchantId: merchant.id, storeName: merchant.name });
  }

  // --------------------
  // Demo group-buy packages (random)
  // --------------------
  await prisma.package.deleteMany({ where: { merchantId: { in: createdMerchants.map((m) => m.merchantId) } } });

  const pkgNamePool = [
    'Family Essentials Box',
    'Cleaning Starter Bundle',
    'Snack Combo Pack',
    'Kitchen Must-haves',
    'Weekly Grocery Saver',
    'Home Care Mega Pack',
    'Breakfast & Coffee Kit',
    'Kids Lunch Box Bundle',
  ];

  const itemNamePool = [
    'Toilet Paper',
    'Kitchen Towel',
    'Dish Soap',
    'Laundry Detergent',
    'Trash Bags',
    'Hand Sanitizer',
    'Wet Wipes',
    'Gloves',
    'Shampoo',
    'Coffee Beans',
  ];

  const packagesToCreate = randInt(4, 6);
  for (let i = 0; i < packagesToCreate; i++) {
    const name = `${pick(pkgNamePool)}${Math.random() < 0.25 ? ` (${pick(['Standard', 'Plus', 'Premium'])})` : ''}`;
    const deal = randInt(1999, 8999) / 100; // 19.99 - 89.99
    const original = deal + randInt(500, 2500) / 100; // +5 - +25
    const region = pickRegion();
    const merchantId = pick(createdMerchants).merchantId;

    const itemsCount = randInt(3, 6);
    const items: any[] = [];
    for (let j = 0; j < itemsCount; j++) {
      const title = pick(itemNamePool);
      items.push({
        title,
        quantity: randInt(1, 4),
        // Demo placeholders (Shopify IDs not required for basic group-buy browsing)
        shopifyProductId: `demo_prod_${i}_${j}`,
        shopifyVariantId: `demo_var_${i}_${j}`,
      });
    }

    await prisma.package.create({
      data: {
        name,
        description: `Popular group-buy deal in ${region}, Sydney. Limited quantity, first come first served.`,
        originalPrice: original.toFixed(2),
        price: deal.toFixed(2),
        itemsJson: JSON.stringify(items),
        deliveryDatesJson: JSON.stringify(buildDeliveryDates(10, randInt(3, 5))),
        region,
        imageUrl: null,
        isActive: true,
        sortOrder: i,
        merchantId,
      },
    });
  }

  console.log('✅ Demo seed completed.\n');
  console.log('User account:');
  console.log(`- email: ${demoUser.email}`);
  console.log(`- phone: ${demoUser.phone}`);
  console.log(`- password: ${demoPassword}\n`);

  console.log('Merchant accounts:');
  for (const m of createdMerchants) {
    console.log(`- ${m.storeName}: email=${m.userEmail}, phone=${m.userPhone}, password=${demoPassword}`);
  }
  console.log('\nOpen:');
  console.log('- /login');
  console.log('- /account (merchant accounts will see merchant tools)');
  console.log('- /service-booking');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

