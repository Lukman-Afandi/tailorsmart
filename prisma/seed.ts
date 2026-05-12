import {
  PrismaClient,
  OrderStatus,
  StitchCategory,
  StitchProgress,
  OrderPriority,
  PaymentStatus,
  SubscriptionPlan,
  TenantSubscriptionStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // await prisma.customerOrderHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenantNotification.deleteMany();
  await prisma.subscriptionEvent.deleteMany();
  await prisma.backgroundJob.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.platformAdmin.deleteMany();
  await prisma.business.deleteMany();

  const passwordHash = await hash("Password123", 12);

  const bisnisA = await prisma.business.create({
    data: {
      name: "Jahit Jaya Studio",
      slug: "jahit-jaya-studio",
      plan: SubscriptionPlan.BASIC,
      subscriptionStatus: TenantSubscriptionStatus.ACTIVE,
      trialEndsAt: null,
      onboardingCompletedAt: new Date(),
      phone: "+6281212345678",
      address: "Jl. Kartini No. 10, Bandung",
      logoUrl: null,
    },
  });

  const bisnisB = await prisma.business.create({
    data: {
      name: "Tailor Premium",
      slug: "tailor-premium",
      plan: SubscriptionPlan.PROFESSIONAL,
      subscriptionStatus: TenantSubscriptionStatus.ACTIVE,
      trialEndsAt: null,
      onboardingCompletedAt: new Date(),
      phone: "+6289876543210",
      address: "Jl. Sudirman No. 88, Jakarta",
    },
  });

  const branchA = await prisma.branch.create({
    data: {
      businessId: bisnisA.id,
      name: "Pusat",
      slug: "pusat",
      isDefault: true,
    },
  });
  const branchB = await prisma.branch.create({
    data: {
      businessId: bisnisB.id,
      name: "Pusat",
      slug: "pusat",
      isDefault: true,
    },
  });

  await prisma.user.create({
    data: {
      email: "owner@jahitjaya.test",
      name: "Budi Santoso",
      passwordHash,
      businessId: bisnisA.id,
      role: "OWNER",
    },
  });

  await prisma.user.create({
    data: {
      email: "owner@tailorpremium.test",
      name: "Siti Aminah",
      passwordHash,
      businessId: bisnisB.id,
      role: "OWNER",
    },
  });

  const insertedA = await prisma.customer.createMany({
    data: [
      {
        businessId: bisnisA.id,
        branchId: branchA.id,
        name: "Andi Wijaya",
        phone: "081234567890",
        address: "Jl. Merdeka 1",
        notes: "Preferensi kancing ekstra",
        bodyMeasurements: {
          dada: "96",
          pinggang: "84",
          tinggiBadan: "172",
        },
        nextFollowUpAt: new Date(Date.now() + 3 * 86400000),
      },
      {
        businessId: bisnisA.id,
        branchId: branchA.id,
        name: "Dewi Lestari",
        phone: "082233445566",
        address: "Komplek Mawar Blok C",
        notes: "",
        bodyMeasurements: {
          dada: "88",
          pinggang: "74",
          panjangBaju: "62",
        },
      },
    ],
  });

  const cList = await prisma.customer.findMany({
    where: { businessId: bisnisA.id },
  });

  if (cList[0]) {
    await prisma.order.createMany({
      data: [
        {
          businessId: bisnisA.id,
          branchId: branchA.id,
          customerId: cList[0].id,
          title: "Jas formal hitam",
          description: "Acara pernikahan",
          status: OrderStatus.IN_PROGRESS,
          amount: 2500000,
          category: StitchCategory.JAS,
          stitchProgress: StitchProgress.SEWING,
          priority: OrderPriority.HIGH,
          paymentStatus: PaymentStatus.DP,
          dpAmount: 1_000_000,
          amountPaid: 1_000_000,
        },
        {
          businessId: bisnisA.id,
          branchId: branchA.id,
          customerId: cList[0].id,
          title: "Kemeja batik",
          status: OrderStatus.COMPLETED,
          amount: 450000,
          category: StitchCategory.BAJU,
          stitchProgress: StitchProgress.READY,
          paymentStatus: PaymentStatus.LUNAS,
          amountPaid: 450000,
        },
      ],
    });
  }

  const insertedB = await prisma.customer.createMany({
    data: Array.from({ length: 5 }).map((_, i) => ({
      businessId: bisnisB.id,
      branchId: branchB.id,
      name: `Pelanggan Demo ${i + 1}`,
      phone: `0899000111${i}${i}`,
      address: `Alamat contoh ${i + 1}`,
      notes: i % 2 === 0 ? "VIP" : "",
      bodyMeasurements: { dada: String(90 + i), pinggang: String(78 + i) },
    })),
  });

  const cB = await prisma.customer.findMany({
    where: { businessId: bisnisB.id },
  });
  if (cB[0]) {
    await prisma.order.create({
      data: {
        businessId: bisnisB.id,
        branchId: branchB.id,
        customerId: cB[0].id,
        title: "Setelan dinas",
        status: OrderStatus.PENDING,
        amount: 1200000,
        category: StitchCategory.SERAGAM,
        paymentStatus: PaymentStatus.HUTANG,
        amountPaid: 0,
      },
    });
  }

  // const allOrders = await prisma.order.findMany();
  // if (allOrders.length > 0) {
  //   await prisma.customerOrderHistory.createMany({
  //     data: allOrders.map((o) => ({
  //       businessId: o.businessId,
  //       customerId: o.customerId,
  //       orderId: o.id,
  //       title: o.title,
  //       description: o.description,
  //       status: o.status,
  //       amount: o.amount,
  //       orderCreatedAt: o.createdAt,
  //       orderUpdatedAt: o.updatedAt,
  //     })),
  //   });
  // }

  const bootEmail = process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  const bootPw = process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD;
  if (bootEmail && bootPw) {
    await prisma.platformAdmin.upsert({
      where: { email: bootEmail },
      create: {
        email: bootEmail,
        passwordHash: await hash(bootPw, 12),
        name: "Super Admin",
      },
      update: { passwordHash: await hash(bootPw, 12) },
    });
    console.log("Platform admin upsert:", bootEmail);
  }

  console.log("Seed OK:", {
    tenants: 2,
    customersBusinessA: insertedA.count,
    customersBusinessB: insertedB.count,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
