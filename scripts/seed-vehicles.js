"use strict";
const fs = require('node:fs');
const path = require('node:path');
const prisma = require('../src/lib/prisma');

const cars = [
  { slug: 'stepwgn-white', name: 'Honda Stepwgn — белый', shortDescription: 'Просторный минивэн для семейных, индивидуальных и междугородних поездок по Хакасии.', image: 'autopark-stepwgn-white.webp' },
  { slug: 'stepwgn-dark', name: 'Honda Stepwgn — тёмный', shortDescription: 'Вместительный минивэн для поездок по городу и междугородних маршрутов.', image: 'autopark-stepwgn-dark.webp' },
  { slug: 'voxy-white', name: 'Toyota Voxy — белый', shortDescription: 'Минивэн для индивидуальных трансферов, отдыха и поездок по Хакасии.', image: 'autopark-voxy-white.webp' }
];

async function main() {
  if (!process.argv.includes('--confirm-empty-transfer19')) {
    throw new Error('Это вспомогательный скрипт. Для запуска нужен флаг --confirm-empty-transfer19 и отдельное согласование.');
  }
  const count = await prisma.vehicle.count();
  if (count !== 0) throw new Error('В базе уже есть автомобили; скрипт отказывается менять или удалять их.');
  for (const [index, car] of cars.entries()) {
    const photoPath = path.join(__dirname, '..', 'site', 'img', car.image);
    const hasPhoto = fs.existsSync(photoPath);
    const image = hasPhoto ? `/site/img/${car.image}` : null;
    await prisma.vehicle.create({
      data: {
        slug: car.slug, name: car.name, shortDescription: car.shortDescription,
        description: car.shortDescription, serviceArea: 'Хакасия и соседние регионы',
        published: true, sortOrder: (index + 1) * 10,
        // Seats, luggage specs, amenities are intentionally not invented.
        previewImage: image,
        images: image ? { create: [{ image, alt: car.name, sortOrder: 0 }] } : undefined
      }
    });
  }
  console.info('Создано 3 автомобиля. Проверьте галереи и заполните подтверждённые характеристики в CRM.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
