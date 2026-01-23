import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPrice(min: number, max: number): string {
  const cents = randInt(min * 100, max * 100);
  return (cents / 100).toFixed(2);
}

function buildTimeSlots(daysAhead = 14, perService = 8): string[] {
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
  // de-dupe + sort
  return Array.from(new Set(slots)).sort();
}

async function main() {
  const count = await prisma.service.count();
  const baseNames = [
    'Home Cleaning',
    'Deep Cleaning',
    'Appliance Installation',
    'Furniture Assembly',
    'Handyman Visit',
    'Moving Help',
    'Car Wash (On-site)',
    'Gardening / Lawn Care',
    'AC Cleaning',
    'Pest Control (Basic)',
  ];
  const descTemplates = [
    'Professional service with flexible time slots.',
    'Includes standard materials. Extra requests can be noted when booking.',
    'Fast response and clear confirmation flow.',
    'Suitable for apartments and houses. Please prepare access instructions.',
  ];
  const durations = [30, 45, 60, 90, 120];

  const toCreate = randInt(6, 10);
  const services = Array.from({ length: toCreate }).map((_, idx) => {
    const name = `${pick(baseNames)}${Math.random() < 0.25 ? ` (${pick(['Standard', 'Plus', 'Premium'])})` : ''}`;
    const durationMins = pick(durations);
    const price = randPrice(39, 199);
    const description = `${pick(descTemplates)}\n\nEstimated duration: ${durationMins} mins.`;
    const timeSlots = buildTimeSlots(21, randInt(6, 10));

    return {
      name,
      description,
      price,
      durationMins,
      timeSlotsJson: JSON.stringify(timeSlots),
      imageUrl: null as string | null,
      isActive: true,
      sortOrder: count + idx,
    };
  });

  const result = await prisma.service.createMany({ data: services });
  console.log(`✅ Seeded ${result.count} services.`);
  console.log(`Open: /service-booking`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

