import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

type Role = 'USER' | 'MERCHANT' | 'ADMIN';

function newDashboardKey() {
  return crypto.randomBytes(12).toString('hex');
}

function toCents(price: number) {
  return Math.round(price * 100);
}

function centsToStr(cents: number) {
  return (cents / 100).toFixed(2);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

async function upsertUser(params: { email: string; phone: string; password: string; role: Role }) {
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

async function resetDatabase() {
  // Delete in dependency order
  await prisma.merchantReview.deleteMany();
  await prisma.merchantQuote.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.serviceBooking.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productNameMapping.deleteMany();
  await prisma.package.deleteMany();
  await prisma.service.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  const demoPassword = 'Test123456';

  console.log('🧹 Resetting database tables...');
  await resetDatabase();
  console.log('✅ Database cleared.');

  // --------------------
  // Admin accounts (2)
  // --------------------
  const adminAccounts = [
    { email: 'admin1@test.local', phone: '0220000101', role: 'ADMIN' as const },
    { email: 'admin2@test.local', phone: '0220000102', role: 'ADMIN' as const },
  ];
  for (const a of adminAccounts) {
    await upsertUser({ ...a, password: demoPassword });
  }

  // --------------------
  // Users (5)
  // --------------------
  const userAccounts = Array.from({ length: 5 }).map((_, i) => ({
    email: `user${i + 1}@test.local`,
    phone: `02200000${10 + i}`,
    role: 'USER' as const,
  }));
  for (const u of userAccounts) {
    await upsertUser({ ...u, password: demoPassword });
  }

  // --------------------
  // Merchants (10, diverse) + each merchant has services & packages
  // --------------------
  const merchantSpecs = [
    {
      key: 'cleaning',
      storeName: 'CleanPro',
      contactName: 'Alice',
      wechat: 'cleanpro_au',
      address: '350 George St, Sydney NSW 2000',
      openHours: 'Mon-Fri 09:00-18:00',
      description: 'Cleaning services for apartments and houses. Reliable scheduling and clear pricing.',
      services: [
        { name: 'Home Cleaning', price: 89, durationMins: 120 },
        { name: 'Deep Cleaning', price: 149, durationMins: 180 },
        { name: 'End of Lease Cleaning (Basic)', price: 229, durationMins: 240 },
      ],
      packages: [
        { name: 'Cleaning Starter Bundle', deal: 39.99, original: 59.99, items: ['Spray Cleaner', 'Microfiber Cloths', 'Sponges', 'Trash Bags'] },
        { name: 'Home Care Mega Pack', deal: 69.99, original: 99.99, items: ['Laundry Detergent', 'Dish Soap', 'Paper Towels', 'Wet Wipes', 'Gloves'] },
      ],
    },
    {
      key: 'handyman',
      storeName: 'HandyWorks',
      contactName: 'Chris',
      wechat: 'handyworks',
      address: '33 Euston Rd, Alexandria NSW 2015',
      openHours: 'Mon-Sat 09:00-18:00',
      description: 'Handyman visits, assembly, drilling, and light repairs.',
      services: [
        { name: 'Handyman Visit (60 mins)', price: 99, durationMins: 60 },
        { name: 'Furniture Assembly', price: 119, durationMins: 90 },
        { name: 'Appliance Installation', price: 129, durationMins: 90 },
      ],
      packages: [{ name: 'Home Fix Essentials', deal: 29.99, original: 45.0, items: ['Screws Set', 'Wall Hooks', 'Measuring Tape', 'Glue'] }],
    },
    {
      key: 'moving',
      storeName: 'SwiftMove',
      contactName: 'Dylan',
      wechat: 'swiftmove_syd',
      address: '5 Regent St, Chippendale NSW 2008',
      openHours: 'Daily 08:00-20:00',
      description: 'Moving help and small deliveries. Friendly team, flexible booking.',
      services: [
        { name: 'Moving Help (2 hours)', price: 199, durationMins: 120 },
        { name: 'Small Delivery (Inner Sydney)', price: 89, durationMins: 60 },
      ],
      packages: [{ name: 'Moving Supplies Pack', deal: 49.99, original: 79.99, items: ['Cardboard Boxes', 'Packing Tape', 'Bubble Wrap', 'Marker Pens'] }],
    },
    {
      key: 'gardening',
      storeName: 'GreenLeaf Garden',
      contactName: 'Evan',
      wechat: 'greenleaf_garden',
      address: '88 Victoria Rd, Drummoyne NSW 2047',
      openHours: 'Mon-Sun 09:00-17:00',
      description: 'Gardening, mowing, trimming, and seasonal cleanup.',
      services: [
        { name: 'Lawn Mowing (Standard)', price: 79, durationMins: 60 },
        { name: 'Garden Cleanup (2 hours)', price: 169, durationMins: 120 },
      ],
      packages: [{ name: 'Garden Tool Mini Pack', deal: 24.99, original: 39.99, items: ['Gloves', 'Pruning Shears', 'Garden Bag'] }],
    },
    {
      key: 'carwash',
      storeName: 'ShinyRide Mobile',
      contactName: 'Fiona',
      wechat: 'shinyride_mobile',
      address: '12-16 O’Riordan St, Mascot NSW 2020',
      openHours: 'Daily 10:00-18:00',
      description: 'On-site car wash and detailing. Book time slots and enjoy a clean ride.',
      services: [
        { name: 'Car Wash (On-site)', price: 59, durationMins: 45 },
        { name: 'Interior Detailing (Basic)', price: 109, durationMins: 90 },
      ],
      packages: [{ name: 'Car Care Bundle', deal: 19.99, original: 34.99, items: ['Car Shampoo', 'Microfiber Towels', 'Air Freshener'] }],
    },
    {
      key: 'beauty',
      storeName: 'Glow Beauty Studio',
      contactName: 'Grace',
      wechat: 'glowbeauty_syd',
      address: '1/235 Oxford St, Bondi Junction NSW 2022',
      openHours: 'Tue-Sun 10:00-19:00',
      description: 'Beauty services: lashes, brows, and basic skincare treatments.',
      services: [
        { name: 'Brow Shaping', price: 39, durationMins: 30 },
        { name: 'Lash Lift', price: 89, durationMins: 60 },
      ],
      packages: [{ name: 'Skincare Starter Pack', deal: 39.99, original: 59.99, items: ['Cleanser', 'Moisturizer', 'Sunscreen'] }],
    },
    {
      key: 'petcare',
      storeName: 'Paws & Care',
      contactName: 'Hannah',
      wechat: 'paws_care',
      address: '77 Pacific Hwy, North Sydney NSW 2060',
      openHours: 'Daily 09:00-18:00',
      description: 'Pet grooming and basic pet sitting services.',
      services: [
        { name: 'Dog Grooming (Small)', price: 79, durationMins: 60 },
        { name: 'Cat Grooming', price: 69, durationMins: 60 },
      ],
      packages: [{ name: 'Pet Treats Box', deal: 24.99, original: 39.99, items: ['Dog Treats', 'Cat Treats', 'Chew Toy'] }],
    },
    {
      key: 'tutoring',
      storeName: 'StudyBoost Tutoring',
      contactName: 'Ivan',
      wechat: 'studyboost',
      address: 'Level 3, 99 George St, Sydney NSW 2000',
      openHours: 'Mon-Fri 15:00-20:00',
      description: 'One-on-one tutoring: Math, English, and exam prep.',
      services: [
        { name: 'Math Tutoring (60 mins)', price: 79, durationMins: 60 },
        { name: 'English Writing Coaching (60 mins)', price: 79, durationMins: 60 },
      ],
      packages: [{ name: 'Stationery Combo', deal: 14.99, original: 24.99, items: ['Notebook', 'Pens Set', 'Highlighters'] }],
    },
    {
      key: 'appliance',
      storeName: 'FixIt Appliances',
      contactName: 'Jack',
      wechat: 'fixit_appliances',
      address: '44 Parramatta Rd, Ashfield NSW 2131',
      openHours: 'Mon-Sat 09:00-18:00',
      description: 'Appliance diagnostics and basic repairs. Transparent quotes.',
      services: [
        { name: 'Appliance Diagnostics', price: 89, durationMins: 60 },
        { name: 'Washing Machine Repair (Basic)', price: 149, durationMins: 90 },
      ],
      packages: [{ name: 'Home Electrical Basics', deal: 19.99, original: 29.99, items: ['Extension Cord', 'Batteries Pack', 'LED Bulbs'] }],
    },
    {
      key: 'mooncake',
      storeName: 'Mooncake House',
      contactName: 'Linda',
      wechat: 'yue_man_xuan',
      address: '18 Dixon St, Haymarket NSW 2000',
      openHours: 'Daily 11:00-21:00',
      description:
        'Mooncake specialty store for Mid-Autumn Festival: classic and modern flavors. Supports group-buy gift boxes and custom flavor requests.',
      services: [
        { name: 'Custom Mooncake Flavor Request (Consultation + Sampling)', price: 49, durationMins: 30 },
        { name: 'Corporate / Group Gift Box Customization (Plan & Design)', price: 99, durationMins: 60 },
      ],
      packages: [
        {
          name: 'Classic Lotus Paste (Double Yolk) Gift Box (8 pcs)',
          deal: 49.9,
          original: 69.9,
          items: ['Lotus Paste (Double Yolk) Mooncake x8', 'Gift Box Packaging x1'],
        },
        {
          name: 'Modern Flavors Mixed Gift Box (8 pcs)',
          deal: 59.9,
          original: 79.9,
          items: ['Matcha Lava Mooncake x2', 'Durian Snow Skin Mooncake x2', 'Cheese Custard Mooncake x2', 'Low-Sugar Mixed Nut Mooncake x2'],
        },
        { name: 'Mini Mooncake Sharing Pack (12 pcs)', deal: 39.9, original: 59.9, items: ['Mini Mooncakes (Assorted Flavors) x12', 'Sharing Pack Packaging x1'] },
      ],
    },
  ] as const;

  const regions = ['Sydney CBD', 'Inner West', 'North Shore', 'Eastern Suburbs'] as const;

  function imageForKey(key: string) {
    return `/images/merchants/${key}.png`;
  }

  function imageForItemTitle(title: string, merchantKey: string) {
    const t = String(title || '').toLowerCase();

    // Mooncake / sweets
    if (t.includes('mooncake')) return '/images/items/mooncake.png';
    if (t.includes('cookie')) return '/images/items/cookie.png';

    // Cleaning / household
    if (t.includes('soap') || t.includes('detergent') || t.includes('cleaner')) return '/images/items/soap.png';
    if (t.includes('glove')) return '/images/items/gloves.png';
    if (t.includes('paper') || t.includes('towel') || t.includes('tissue') || t.includes('wipe')) return '/images/items/paper.png';
    if (t.includes('sponge') || t.includes('cloth')) return '/images/items/sponge.png';

    // Beauty / skincare
    if (t.includes('cleanser') || t.includes('moisturizer') || t.includes('sunscreen') || t.includes('mask') || t.includes('skincare')) {
      return '/images/items/lotion.png';
    }

    // Study / stationery
    if (t.includes('book')) return '/images/items/book.png';
    if (t.includes('notebook') || t.includes('pens') || t.includes('pen') || t.includes('highlighter') || t.includes('planner') || t.includes('flashcard')) {
      return '/images/items/memo.png';
    }

    // Home maintenance
    if (t.includes('battery')) return '/images/items/battery.png';
    if (t.includes('bulb') || t.includes('led')) return '/images/items/bulb.png';

    // Default
    return imageForKey(merchantKey);
  }

  const extraServiceTemplates: Record<string, Array<{ name: string; price: number; durationMins: number }>> = {
    cleaning: [
      { name: 'Kitchen & Bathroom Focus (90 mins)', price: 119, durationMins: 90 },
      { name: 'Carpet Spot Cleaning (45 mins)', price: 59, durationMins: 45 },
    ],
    handyman: [
      { name: 'Wall Mounting (TV / Shelf)', price: 139, durationMins: 90 },
      { name: 'Minor Plumbing Fix (Basic)', price: 129, durationMins: 90 },
    ],
    moving: [
      { name: 'Packing Assistance (2 hours)', price: 179, durationMins: 120 },
      { name: 'Furniture Disassembly/Reassembly', price: 159, durationMins: 120 },
    ],
    gardening: [
      { name: 'Hedge Trimming (Standard)', price: 119, durationMins: 90 },
      { name: 'Seasonal Garden Refresh (2 hours)', price: 179, durationMins: 120 },
    ],
    carwash: [
      { name: 'Exterior Detailing (Premium)', price: 149, durationMins: 120 },
      { name: 'Headlight Restoration', price: 89, durationMins: 60 },
    ],
    beauty: [
      { name: 'Basic Facial (60 mins)', price: 99, durationMins: 60 },
      { name: 'Brow + Lash Combo', price: 119, durationMins: 75 },
    ],
    petcare: [
      { name: 'Pet Sitting (2 hours)', price: 79, durationMins: 120 },
      { name: 'Nail Trimming', price: 29, durationMins: 20 },
    ],
    tutoring: [
      { name: 'Exam Prep Session (90 mins)', price: 109, durationMins: 90 },
      { name: 'Homework Help (60 mins)', price: 79, durationMins: 60 },
    ],
    appliance: [
      { name: 'Fridge Repair (Basic)', price: 159, durationMins: 90 },
      { name: 'Dishwasher Repair (Basic)', price: 159, durationMins: 90 },
    ],
    mooncake: [],
  };

  const extraPackageTemplates: Record<string, Array<{ name: string; deal: number; original: number; items: string[] }>> = {
    cleaning: [
      { name: 'Bathroom Cleaning Kit', deal: 24.99, original: 39.99, items: ['Bathroom Cleaner', 'Scrub Sponges', 'Gloves', 'Microfiber Cloths'] },
      { name: 'Kitchen Essentials Bundle', deal: 29.99, original: 44.99, items: ['Dish Soap', 'Degreaser Spray', 'Paper Towels', 'Trash Bags'] },
    ],
    handyman: [
      { name: 'DIY Fasteners Set', deal: 19.99, original: 29.99, items: ['Screws Assortment', 'Wall Plugs', 'Nails Set', 'Cable Ties'] },
      { name: 'Home Mounting Pack', deal: 24.99, original: 39.99, items: ['Wall Hooks', 'Picture Hangers', 'Double-sided Tape', 'Level Tool (Mini)'] },
    ],
    moving: [
      { name: 'Packing Material Bundle', deal: 39.99, original: 59.99, items: ['Bubble Wrap', 'Packing Paper', 'Tape Set', 'Labels'] },
      { name: 'Apartment Move Kit', deal: 59.99, original: 89.99, items: ['Boxes (Assorted)', 'Stretch Wrap', 'Corner Protectors', 'Marker Pens'] },
    ],
    gardening: [
      { name: 'Plant Care Bundle', deal: 19.99, original: 34.99, items: ['Plant Food', 'Spray Bottle', 'Gloves', 'Pruning Shears (Mini)'] },
      { name: 'Lawn Care Starter Pack', deal: 24.99, original: 39.99, items: ['Grass Seed', 'Weed Control (Basic)', 'Garden Bag', 'Gloves'] },
    ],
    carwash: [
      { name: 'Interior Fresh Bundle', deal: 14.99, original: 24.99, items: ['Air Freshener', 'Interior Wipes', 'Trash Bags (Car)', 'Microfiber Cloth'] },
      { name: 'Detailing Starter Pack', deal: 24.99, original: 39.99, items: ['Wax Spray', 'Tire Shine', 'Microfiber Towels', 'Applicator Pads'] },
    ],
    beauty: [
      { name: 'Beauty Essentials Pack', deal: 29.99, original: 49.99, items: ['Face Cleanser', 'Sheet Masks x5', 'Hand Cream', 'Lip Balm'] },
      { name: 'Travel Skincare Mini Set', deal: 19.99, original: 34.99, items: ['Mini Cleanser', 'Mini Moisturizer', 'Mini Sunscreen', 'Cotton Pads'] },
    ],
    petcare: [
      { name: 'Pet Grooming Pack', deal: 19.99, original: 34.99, items: ['Pet Shampoo', 'Brush', 'Wipes', 'Treats'] },
      { name: 'Pet Toy Box', deal: 24.99, original: 39.99, items: ['Chew Toy', 'Ball Toy', 'Rope Toy', 'Treats'] },
    ],
    tutoring: [
      { name: 'Study Supplies Bundle', deal: 19.99, original: 29.99, items: ['Notebook Set', 'Pens Set', 'Highlighters', 'Sticky Notes'] },
      { name: 'Exam Prep Pack', deal: 24.99, original: 39.99, items: ['Practice Papers', 'Flashcards', 'Planner', 'Pens Set'] },
    ],
    appliance: [
      { name: 'Home Maintenance Bundle', deal: 24.99, original: 39.99, items: ['LED Bulbs', 'Batteries Pack', 'Cleaning Cloths', 'Extension Cord'] },
      { name: 'Kitchen Appliance Care Pack', deal: 19.99, original: 34.99, items: ['Descaler', 'Cleaning Tablets', 'Microfiber Cloths', 'Gloves'] },
    ],
    mooncake: [],
  };

  const createdMerchants: Array<{ storeName: string; merchantId: string; dashboardKey: string; email: string; phone: string }> = [];

  for (let i = 0; i < merchantSpecs.length; i++) {
    const spec = merchantSpecs[i];
    const email = `merchant${i + 1}@test.local`;
    const phone = `02200002${String(i + 1).padStart(2, '0')}`;
    const user = await upsertUser({ email, phone, password: demoPassword, role: 'MERCHANT' });

    const merchant = await prisma.merchant.create({
      data: {
        name: spec.storeName,
        contactName: spec.contactName,
        phone,
        wechat: spec.wechat,
        email,
        address: spec.address,
        openHours: spec.openHours,
        description: spec.description,
        isActive: true,
        userId: user.id,
        dashboardKey: newDashboardKey(),
        imageUrl: imageForKey(spec.key),
      },
    });

    const allServices = [...spec.services, ...(extraServiceTemplates[spec.key] || [])];
    const minServiceCount = spec.key === 'mooncake' ? 2 : 5;
    const servicesToCreate = allServices.slice(0, Math.max(minServiceCount, spec.services.length));
    for (let s = 0; s < servicesToCreate.length; s++) {
      const svc = servicesToCreate[s];
      const timeSlots = buildTimeSlots(21, randInt(6, 10));
      await prisma.service.create({
        data: {
          name: svc.name,
          description:
            spec.key === 'mooncake'
              ? 'Describe the flavor you want (sweetness/filling/allergens). We will confirm feasibility and pricing within 24 hours.\n\nOptions: low sugar, nut-free, extra durian, stronger matcha, etc.'
              : 'Professional service with flexible time slots.\n\nYou can leave extra notes when booking.',
          price: centsToStr(toCents(svc.price)),
          durationMins: svc.durationMins,
          timeSlotsJson: JSON.stringify(timeSlots),
          imageUrl: imageForKey(spec.key),
          isActive: true,
          sortOrder: s,
          merchantId: merchant.id,
        },
      });
    }

    const allPackages = [...spec.packages, ...(extraPackageTemplates[spec.key] || [])];
    const minPackageCount = spec.key === 'mooncake' ? 3 : 5;
    const packagesToCreate = allPackages.slice(0, Math.max(minPackageCount, spec.packages.length));
    for (let p = 0; p < packagesToCreate.length; p++) {
      const pkg = packagesToCreate[p];
      const region = regions[(i + p) % regions.length];
      const items = pkg.items.map((title, idx) => ({
        title,
        quantity: 1,
        shopifyProductId: `demo_${spec.key}_prod_${p}_${idx}`,
        shopifyVariantId: `demo_${spec.key}_var_${p}_${idx}`,
        imageUrl: imageForItemTitle(title, spec.key),
      }));
      await prisma.package.create({
        data: {
          name: pkg.name,
          description: spec.key === 'mooncake' ? 'Mid-Autumn limited-time group-buy. Limited stock, while supplies last.' : `Popular group-buy deal in ${region}.`,
          originalPrice: centsToStr(toCents(pkg.original)),
          price: centsToStr(toCents(pkg.deal)),
          itemsJson: JSON.stringify(items),
          deliveryDatesJson: JSON.stringify(buildDeliveryDates(10, randInt(3, 5))),
          region,
          imageUrl: imageForKey(spec.key),
          isActive: true,
          sortOrder: p,
          merchantId: merchant.id,
        },
      });
    }

    createdMerchants.push({
      storeName: merchant.name,
      merchantId: merchant.id,
      dashboardKey: merchant.dashboardKey,
      email,
      phone,
    });
  }

  console.log('\n✅ Seed completed.\n');
  console.log('Admin accounts:');
  for (const a of adminAccounts) console.log(`- ${a.email} / ${a.phone} / ${demoPassword}`);

  console.log('\nUser accounts:');
  for (const u of userAccounts) console.log(`- ${u.email} / ${u.phone} / ${demoPassword}`);

  console.log('\nMerchant accounts:');
  for (const m of createdMerchants) {
    console.log(`- ${m.storeName}: ${m.email} / ${m.phone} / ${demoPassword} | merchant dashboard: /service-booking/merchant?key=${m.dashboardKey}`);
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

