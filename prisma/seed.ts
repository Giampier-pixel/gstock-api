import { PrismaClient, ProductStatus, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUser = process.env.ADMIN_SEED_USER;
  const adminHash = process.env.ADMIN_SEED_PASSWORD_HASH;
  const adminName = process.env.ADMIN_SEED_NAME ?? 'Administrador';
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? 'admin@gstock.local';

  if (!adminUser || !adminHash) {
    throw new Error(
      'ADMIN_SEED_USER and ADMIN_SEED_PASSWORD_HASH must be set in .env before seeding.',
    );
  }

  await prisma.user.upsert({
    where: { username: adminUser },
    update: {},
    create: {
      username: adminUser,
      email: adminEmail,
      name: adminName,
      passwordHash: adminHash,
    },
  });

  const acme = await prisma.provider.upsert({
    where: { id: 'seed-provider-acme' },
    update: {},
    create: {
      id: 'seed-provider-acme',
      name: 'ACME Distribuciones',
      contact: 'María López',
      phone: '+54 11 5555 1234',
      email: 'ventas@acme.example',
      address: 'Av. Siempreviva 742, CABA',
    },
  });

  const globex = await prisma.provider.upsert({
    where: { id: 'seed-provider-globex' },
    update: {},
    create: {
      id: 'seed-provider-globex',
      name: 'Globex S.A.',
      contact: 'Carlos Pérez',
      phone: '+54 11 4444 9876',
      email: 'compras@globex.example',
    },
  });

  const products = [
    {
      id: 'seed-product-mouse',
      sku: 'MOU-001',
      name: 'Mouse inalámbrico Pro',
      description: 'Mouse ergonómico con receptor USB-C.',
      category: 'Periféricos',
      price: 24990,
      cost: 14500,
      stock: 48,
      minStock: 10,
      status: ProductStatus.ACTIVE,
      providerId: acme.id,
    },
    {
      id: 'seed-product-keyboard',
      sku: 'KEY-002',
      name: 'Teclado mecánico TKL',
      description: 'Switches lineales rojos, layout español.',
      category: 'Periféricos',
      price: 89990,
      cost: 52000,
      stock: 12,
      minStock: 6,
      status: ProductStatus.ACTIVE,
      providerId: acme.id,
    },
    {
      id: 'seed-product-monitor',
      sku: 'MON-027',
      name: 'Monitor 27" 144Hz',
      description: 'Panel IPS, 1ms, FreeSync.',
      category: 'Monitores',
      price: 459990,
      cost: 310000,
      stock: 4,
      minStock: 5,
      status: ProductStatus.LOW_STOCK,
      providerId: globex.id,
    },
    {
      id: 'seed-product-usb',
      sku: 'USB-064',
      name: 'Pendrive USB 64GB',
      description: 'USB 3.2, lectura 200 MB/s.',
      category: 'Almacenamiento',
      price: 12990,
      cost: 5800,
      stock: 0,
      minStock: 20,
      status: ProductStatus.INACTIVE,
      providerId: globex.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  const admin = await prisma.user.findUnique({ where: { username: adminUser } });

  const seedMovements = [
    { id: 'seed-mov-1', productId: 'seed-product-mouse', type: MovementType.IN, quantity: 20, reason: 'Reposición inicial' },
    { id: 'seed-mov-2', productId: 'seed-product-keyboard', type: MovementType.OUT, quantity: 3, reason: 'Venta minorista' },
    { id: 'seed-mov-3', productId: 'seed-product-monitor', type: MovementType.OUT, quantity: 1, reason: 'Venta corporativa' },
  ];

  for (const mov of seedMovements) {
    await prisma.movement.upsert({
      where: { id: mov.id },
      update: {},
      create: { ...mov, userId: admin?.id ?? null },
    });
  }

  console.log('✓ Seed completed: 1 admin, 2 providers, 4 products, 3 movements.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
