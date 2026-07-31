import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.syncConflict.deleteMany();
  await prisma.syncEvent.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.syncMeta.deleteMany();

  const store = await prisma.store.create({
    data: {
      name: "ZentraLab Demo Store",
      slug: "demo-store",
      currency: "CAD",
      taxBps: 1300,
      policies: "Returns within 14 days with receipt. Online orders ready in 2 hours.",
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  await prisma.user.createMany({
    data: [
      {
        email: "owner@demo.store",
        name: "Demo Owner",
        passwordHash,
        role: "owner",
        storeId: store.id,
      },
      {
        email: "cashier@demo.store",
        name: "Demo Cashier",
        passwordHash,
        role: "cashier",
        storeId: store.id,
      },
      {
        email: "staff@demo.store",
        name: "Demo Staff",
        passwordHash,
        role: "staff",
        storeId: store.id,
      },
    ],
  });

  const catalog = [
    {
      sku: "USB-C-HUB",
      barcode: "0123456789012",
      name: "USB-C Hub 7-in-1",
      description: "HDMI, USB 3.0, SD card reader",
      priceCents: 4999,
      onHand: 24,
      reorderPoint: 6,
    },
    {
      sku: "KB-MECH",
      barcode: "0123456789013",
      name: "Mechanical Keyboard",
      description: "Tactile switches, RGB backlight",
      priceCents: 8999,
      onHand: 12,
      reorderPoint: 4,
    },
    {
      sku: "MSE-WL",
      barcode: "0123456789014",
      name: "Wireless Mouse",
      description: "Ergonomic, 2.4GHz + Bluetooth",
      priceCents: 3499,
      onHand: 40,
      reorderPoint: 10,
    },
    {
      sku: "CBL-USB-C",
      barcode: "0123456789015",
      name: "USB-C Cable 2m",
      description: "100W charging cable",
      priceCents: 1999,
      onHand: 80,
      reorderPoint: 20,
    },
    {
      sku: "SSD-1TB",
      barcode: "0123456789016",
      name: "1TB Portable SSD",
      description: "USB 3.2 Gen 2, up to 1050MB/s",
      priceCents: 12999,
      onHand: 8,
      reorderPoint: 3,
    },
    {
      sku: "WBCAM-HD",
      barcode: "0123456789017",
      name: "HD Webcam 1080p",
      description: "Auto-focus, dual mics",
      priceCents: 5999,
      onHand: 15,
      reorderPoint: 5,
    },
  ];

  for (const item of catalog) {
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        taxBps: 1300,
        active: true,
      },
    });
    await prisma.inventory.create({
      data: {
        storeId: store.id,
        productId: product.id,
        onHand: item.onHand,
        reserved: 0,
        reorderPoint: item.reorderPoint,
      },
    });
  }

  await prisma.syncMeta.create({ data: { id: "global", serverVersion: 1 } });

  console.log("Seeded demo store:", store.slug);
  console.log("Login: owner@demo.store / demo1234");
  console.log("Cashier: cashier@demo.store / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
