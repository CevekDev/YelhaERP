import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('Admin1234', 12)

  const company = await prisma.company.upsert({
    where: { id: 'demo-company' },
    update: {},
    create: {
      id: 'demo-company',
      name: 'SARL Demo YelhaERP',
      businessType: 'RC',
      legalForm: 'SARL',
      nif: '123456789012345',
      plan: 'PRO',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@yelhaerp.dz' },
    update: {},
    create: {
      email: 'demo@yelhaerp.dz',
      password: hash,
      name: 'Ahmed Benali',
      role: 'OWNER',
      companyId: company.id,
    },
  })

  // --- Suppliers ---
  const [sup1, sup2] = await Promise.all([
    prisma.supplier.upsert({
      where: { id: 'sup-1' },
      update: {},
      create: { id: 'sup-1', companyId: company.id, name: 'EURL Matériaux Algérie', email: 'contact@mat-dz.com', phone: '0551000001' },
    }),
    prisma.supplier.upsert({
      where: { id: 'sup-2' },
      update: {},
      create: { id: 'sup-2', companyId: company.id, name: 'Sarl Fournitures Pro', email: 'info@fourpro.dz', phone: '0661000002' },
    }),
  ])

  // --- Products ---
  const products = await Promise.all([
    prisma.product.upsert({ where: { id: 'prod-1' }, update: {}, create: { id: 'prod-1', companyId: company.id, name: 'Ciment Portland 50kg', sku: 'CIM-50', unitPrice: 850, stockQty: 200, stockAlert: 20, isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-2' }, update: {}, create: { id: 'prod-2', companyId: company.id, name: 'Fer à béton 12mm', sku: 'FER-12', unitPrice: 4200, stockQty: 50, stockAlert: 10, isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-3' }, update: {}, create: { id: 'prod-3', companyId: company.id, name: 'Parpaing 20cm', sku: 'PAR-20', unitPrice: 65, stockQty: 1000, stockAlert: 100, isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-4' }, update: {}, create: { id: 'prod-4', companyId: company.id, name: 'Peinture blanche 25L', sku: 'PNT-25', unitPrice: 3800, stockQty: 30, stockAlert: 5, isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-5' }, update: {}, create: { id: 'prod-5', companyId: company.id, name: 'Câble électrique 2.5mm²', sku: 'CAB-25', unitPrice: 1200, stockQty: 500, stockAlert: 50, isActive: true } }),
  ])

  // --- Clients ---
  const [cl1, cl2, cl3] = await Promise.all([
    prisma.client.upsert({ where: { id: 'cl-1' }, update: {}, create: { id: 'cl-1', companyId: company.id, name: 'SPA Construction Nord', email: 'commandes@conord.dz', phone: '0555100001' } }),
    prisma.client.upsert({ where: { id: 'cl-2' }, update: {}, create: { id: 'cl-2', companyId: company.id, name: 'EURL Bâtiment Moderne', email: 'batmod@gmail.com', phone: '0661200002' } }),
    prisma.client.upsert({ where: { id: 'cl-3' }, update: {}, create: { id: 'cl-3', companyId: company.id, name: 'SARL Travaux Express', email: 'contact@travex.dz', phone: '0771300003' } }),
  ])

  // --- CRM Leads ---
  await Promise.all([
    prisma.lead.upsert({ where: { id: 'lead-1' }, update: {}, create: { id: 'lead-1', companyId: company.id, lastName: 'Khelil', firstName: 'Sofiane', company: 'SPA Constructions Est', email: 's.khelil@cpe.dz', stage: 'QUALIFIED', score: 75, expectedValue: 850000, source: 'WEBSITE' } }),
    prisma.lead.upsert({ where: { id: 'lead-2' }, update: {}, create: { id: 'lead-2', companyId: company.id, lastName: 'Meziane', firstName: 'Leila', company: 'EURL Immobilier Plus', email: 'l.meziane@immoplus.dz', stage: 'PROPOSAL', score: 60, expectedValue: 1200000, source: 'REFERRAL' } }),
    prisma.lead.upsert({ where: { id: 'lead-3' }, update: {}, create: { id: 'lead-3', companyId: company.id, lastName: 'Ould Ali', firstName: 'Karim', company: 'SPA BTP Algérie', email: 'k.ould@btpalg.com', stage: 'NEGOTIATION', score: 90, expectedValue: 3500000, source: 'PHONE' } }),
    prisma.lead.upsert({ where: { id: 'lead-4' }, update: {}, create: { id: 'lead-4', companyId: company.id, lastName: 'Benabdallah', firstName: 'Yasmine', company: 'SARL Déco Intérieure', email: 'y.benab@deco.dz', stage: 'CONTACTED', score: 40, expectedValue: 450000, source: 'SOCIAL' } }),
    prisma.lead.upsert({ where: { id: 'lead-5' }, update: {}, create: { id: 'lead-5', companyId: company.id, lastName: 'Ferhat', firstName: 'Mohamed', company: 'EURL Menuiserie Moderne', email: 'm.ferhat@menmod.dz', stage: 'NEW', score: 25, expectedValue: 280000, source: 'MANUAL' } }),
  ])

  // --- Purchase Orders ---
  const po1 = await prisma.purchaseOrder.upsert({
    where: { id: 'po-1' },
    update: {},
    create: {
      id: 'po-1', companyId: company.id, supplierId: sup1.id,
      number: 'BC-2026-001', status: 'APPROVED',
      orderDate: new Date('2026-04-01'),
      subtotal: 170000, taxAmount: 32300, total: 202300,
      lines: {
        create: [
          { productId: products[0].id, description: 'Ciment Portland 50kg', quantity: 100, unitPrice: 850, taxRate: 19, total: 85000 },
          { productId: products[2].id, description: 'Parpaing 20cm', quantity: 1000, unitPrice: 65, taxRate: 19, total: 65000 },
          { productId: products[1].id, description: 'Fer à béton 12mm', quantity: 5, unitPrice: 4200, taxRate: 19, total: 21000 },
        ],
      },
    },
  })

  const po2 = await prisma.purchaseOrder.upsert({
    where: { id: 'po-2' },
    update: {},
    create: {
      id: 'po-2', companyId: company.id, supplierId: sup2.id,
      number: 'BC-2026-002', status: 'DRAFT',
      orderDate: new Date('2026-04-15'),
      subtotal: 38000, taxAmount: 7220, total: 45220,
      lines: {
        create: [
          { productId: products[3].id, description: 'Peinture blanche 25L', quantity: 10, unitPrice: 3800, taxRate: 19, total: 38000 },
        ],
      },
    },
  })

  // --- Warehouses ---
  const wh1 = await prisma.warehouse.upsert({
    where: { id: 'wh-1' },
    update: {},
    create: { id: 'wh-1', companyId: company.id, name: 'Entrepôt Principal', code: 'WH-MAIN', address: 'Zone industrielle, Alger' },
  })

  // --- BOM ---
  const bom1 = await prisma.bOM.upsert({
    where: { id: 'bom-1' },
    update: {},
    create: {
      id: 'bom-1', companyId: company.id,
      productId: products[2].id,
      name: 'Parpaing standard', version: '1.0', yieldQty: 100,
      components: {
        create: [
          { productId: products[0].id, quantity: 0.5, unit: 'sac' },
          { productId: products[1].id, quantity: 0.02, unit: 'kg' },
        ],
      },
    },
  })

  // --- Production Orders ---
  await prisma.productionOrder.upsert({
    where: { id: 'po-prod-1' },
    update: {},
    create: {
      id: 'po-prod-1', companyId: company.id, bomId: bom1.id,
      number: 'OF-2026-001', status: 'IN_PROGRESS',
      plannedQty: 500, producedQty: 120,
      scheduledStart: new Date('2026-04-20'),
      scheduledEnd: new Date('2026-04-30'),
      actualStart: new Date('2026-04-20'),
    },
  })

  await prisma.productionOrder.upsert({
    where: { id: 'po-prod-2' },
    update: {},
    create: {
      id: 'po-prod-2', companyId: company.id, bomId: bom1.id,
      number: 'OF-2026-002', status: 'CONFIRMED',
      plannedQty: 1000, producedQty: 0,
      scheduledStart: new Date('2026-05-05'),
      scheduledEnd: new Date('2026-05-20'),
    },
  })

  // --- Projects ---
  const proj1 = await prisma.project.upsert({
    where: { id: 'proj-1' },
    update: {},
    create: {
      id: 'proj-1', companyId: company.id, clientId: cl1.id,
      name: 'Chantier Résidence Nord', code: 'PROJ-001',
      status: 'ACTIVE', budget: 5000000,
      startDate: new Date('2026-03-01'), endDate: new Date('2026-09-30'),
    },
  })

  const proj2 = await prisma.project.upsert({
    where: { id: 'proj-2' },
    update: {},
    create: {
      id: 'proj-2', companyId: company.id, clientId: cl2.id,
      name: 'Rénovation Villa Benaknoun', code: 'PROJ-002',
      status: 'ACTIVE', budget: 1800000,
      startDate: new Date('2026-04-01'), endDate: new Date('2026-07-31'),
    },
  })

  await Promise.all([
    prisma.projectTask.upsert({ where: { id: 'task-1' }, update: {}, create: { id: 'task-1', projectId: proj1.id, title: 'Fondations et terrassement', status: 'DONE', priority: 'HIGH', assignedTo: demoUser.id, dueDate: new Date('2026-03-31') } }),
    prisma.projectTask.upsert({ where: { id: 'task-2' }, update: {}, create: { id: 'task-2', projectId: proj1.id, title: 'Gros œuvre — RDC', status: 'IN_PROGRESS', priority: 'HIGH', assignedTo: demoUser.id, dueDate: new Date('2026-04-30') } }),
    prisma.projectTask.upsert({ where: { id: 'task-3' }, update: {}, create: { id: 'task-3', projectId: proj1.id, title: 'Gros œuvre — Étage 1', status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2026-05-31') } }),
    prisma.projectTask.upsert({ where: { id: 'task-4' }, update: {}, create: { id: 'task-4', projectId: proj1.id, title: 'Plomberie et électricité', status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2026-07-31') } }),
    prisma.projectTask.upsert({ where: { id: 'task-5' }, update: {}, create: { id: 'task-5', projectId: proj2.id, title: 'Démolition intérieure', status: 'DONE', priority: 'HIGH', dueDate: new Date('2026-04-10') } }),
    prisma.projectTask.upsert({ where: { id: 'task-6' }, update: {}, create: { id: 'task-6', projectId: proj2.id, title: 'Carrelage et faïence', status: 'IN_PROGRESS', priority: 'MEDIUM', assignedTo: demoUser.id, dueDate: new Date('2026-05-15') } }),
  ])

  // --- Leave Types ---
  const [lt1, lt2] = await Promise.all([
    prisma.leaveType.upsert({ where: { id: 'lt-1' }, update: {}, create: { id: 'lt-1', companyId: company.id, name: 'Congé annuel', maxDaysPerYear: 30, isPaid: true } }),
    prisma.leaveType.upsert({ where: { id: 'lt-2' }, update: {}, create: { id: 'lt-2', companyId: company.id, name: 'Congé maladie', maxDaysPerYear: 15, isPaid: true } }),
  ])

  // --- Leave Requests ---
  await Promise.all([
    prisma.leaveRequest.upsert({ where: { id: 'lr-1' }, update: {}, create: { id: 'lr-1', companyId: company.id, employeeId: demoUser.id, leaveTypeId: lt1.id, startDate: new Date('2026-05-10'), endDate: new Date('2026-05-20'), days: 10, status: 'PENDING', reason: 'Vacances familiales' } }),
    prisma.leaveRequest.upsert({ where: { id: 'lr-2' }, update: {}, create: { id: 'lr-2', companyId: company.id, employeeId: demoUser.id, leaveTypeId: lt2.id, startDate: new Date('2026-04-22'), endDate: new Date('2026-04-24'), days: 3, status: 'APPROVED', reason: 'Consultation médicale' } }),
  ])

  // --- Job Posting ---
  await prisma.jobPosting.upsert({
    where: { id: 'jp-1' },
    update: {},
    create: {
      id: 'jp-1', companyId: company.id,
      title: 'Chef de chantier', department: 'Production',
      description: 'Poste de chef de chantier BTP, expérience 5 ans minimum.',
      status: 'OPEN',
    },
  })

  // --- PCN Accounts basics (class 1-7) ---
  const pcnAccounts = [
    { code: '101', name: 'Capital social', type: 'PASSIF' as const },
    { code: '106', name: 'Réserves', type: 'PASSIF' as const },
    { code: '164', name: 'Emprunts bancaires', type: 'PASSIF' as const },
    { code: '211', name: 'Terrains', type: 'ACTIF' as const },
    { code: '213', name: 'Constructions', type: 'ACTIF' as const },
    { code: '300', name: 'Stocks de matières premières', type: 'ACTIF' as const },
    { code: '411', name: 'Clients et comptes rattachés', type: 'ACTIF' as const },
    { code: '401', name: 'Fournisseurs et comptes rattachés', type: 'PASSIF' as const },
    { code: '512', name: 'Banque', type: 'ACTIF' as const },
    { code: '530', name: 'Caisse', type: 'ACTIF' as const },
    { code: '600', name: 'Achats de matières premières', type: 'CHARGE' as const },
    { code: '621', name: 'Personnel extérieur', type: 'CHARGE' as const },
    { code: '631', name: 'Rémunérations du personnel', type: 'CHARGE' as const },
    { code: '641', name: 'Impôts et taxes', type: 'CHARGE' as const },
    { code: '661', name: 'Charges d\'intérêts', type: 'CHARGE' as const },
    { code: '700', name: 'Ventes de produits fabriqués', type: 'PRODUIT' as const },
    { code: '706', name: 'Prestations de services', type: 'PRODUIT' as const },
    { code: '730', name: 'Variations de stocks', type: 'PRODUIT' as const },
    { code: '760', name: 'Produits financiers', type: 'PRODUIT' as const },
  ]
  await Promise.all(
    pcnAccounts.map(a =>
      prisma.accountPCN.upsert({
        where: { companyId_code: { companyId: company.id, code: a.code } },
        update: {},
        create: { companyId: company.id, code: a.code, name: a.name, type: a.type, class: parseInt(a.code[0]), isActive: true },
      })
    )
  )

  // --- Currencies (global, no companyId) ---
  await Promise.all([
    prisma.currency.upsert({ where: { code: 'EUR' }, update: {}, create: { code: 'EUR', name: 'Euro', symbol: '€' } }),
    prisma.currency.upsert({ where: { code: 'USD' }, update: {}, create: { code: 'USD', name: 'Dollar américain', symbol: '$' } }),
    prisma.currency.upsert({ where: { code: 'DZD' }, update: {}, create: { code: 'DZD', name: 'Dinar algérien', symbol: 'DA', isBase: true } }),
  ])

  // ── Restaurant demo data ──────────────────────────────────
  const restConfig = await prisma.restaurantConfig.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      name: 'Restaurant Al Baraka',
      address: '12 Rue Didouche Mourad, Alger-Centre',
      phone: '0551 23 45 67',
      taxRate: 19,
      serviceCharge: 0,
      tablePrefix: 'T',
      orderPrefix: 'CMD',
      enableQrMenu: true,
      enableLoyalty: true,
      loyaltyPointsRate: 10,
      enableDelivery: true,
      deliveryFeeDefault: 200,
      receiptFooter: 'Merci et à bientôt ! — Al Baraka',
      activeStations: ['MAIN', 'COLD', 'DRINKS'],
    },
  })

  const salleRoom = await prisma.restaurantRoom.upsert({
    where: { id: 'room-salle' },
    update: {},
    create: { id: 'room-salle', companyId: company.id, name: 'Salle principale', sortOrder: 0 },
  })
  const terrasseRoom = await prisma.restaurantRoom.upsert({
    where: { id: 'room-terrasse' },
    update: {},
    create: { id: 'room-terrasse', companyId: company.id, name: 'Terrasse', sortOrder: 1 },
  })

  // Create tables for salle
  const tableSalleData = [
    { id: 'table-t1', number: 'T1', capacity: 4, posX: 40, posY: 40, width: 80, height: 80 },
    { id: 'table-t2', number: 'T2', capacity: 4, posX: 160, posY: 40, width: 80, height: 80 },
    { id: 'table-t3', number: 'T3', capacity: 2, posX: 280, posY: 40, width: 60, height: 60 },
    { id: 'table-t4', number: 'T4', capacity: 6, posX: 40, posY: 160, width: 100, height: 80 },
    { id: 'table-t5', number: 'T5', capacity: 4, posX: 180, posY: 160, width: 80, height: 80 },
    { id: 'table-t6', number: 'T6', capacity: 8, posX: 300, posY: 160, width: 120, height: 80 },
    { id: 'table-t7', number: 'T7', capacity: 2, posX: 40, posY: 280, width: 60, height: 60 },
    { id: 'table-t8', number: 'T8', capacity: 4, posX: 160, posY: 280, width: 80, height: 80 },
    { id: 'table-t9', number: 'T9', capacity: 4, posX: 280, posY: 280, width: 80, height: 80 },
    { id: 'table-t10', number: 'T10', capacity: 6, posX: 400, posY: 40, width: 100, height: 100 },
  ]
  for (const t of tableSalleData) {
    await prisma.restaurantTable.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, companyId: company.id, roomId: salleRoom.id, qrToken: `qr-${t.id}` },
    })
  }

  // Create tables for terrasse
  const tableTerrData = [
    { id: 'table-terr1', number: 'TR1', capacity: 2, posX: 40, posY: 40 },
    { id: 'table-terr2', number: 'TR2', capacity: 4, posX: 160, posY: 40 },
    { id: 'table-terr3', number: 'TR3', capacity: 4, posX: 280, posY: 40 },
    { id: 'table-terr4', number: 'TR4', capacity: 6, posX: 40, posY: 160 },
    { id: 'table-terr5', number: 'TR5', capacity: 2, posX: 160, posY: 160 },
    { id: 'table-terr6', number: 'TR6', capacity: 4, posX: 280, posY: 160 },
  ]
  for (const t of tableTerrData) {
    await prisma.restaurantTable.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, companyId: company.id, roomId: terrasseRoom.id, width: 80, height: 80, qrToken: `qr-${t.id}` },
    })
  }

  // Menu categories
  const [catEntrees, catPlats, catGrillades, catBoissons] = await Promise.all([
    prisma.menuCategory.upsert({ where: { id: 'cat-entrees' }, update: {}, create: { id: 'cat-entrees', companyId: company.id, name: 'Entrées', nameAr: 'مقبلات', sortOrder: 0 } }),
    prisma.menuCategory.upsert({ where: { id: 'cat-plats' }, update: {}, create: { id: 'cat-plats', companyId: company.id, name: 'Plats chauds', nameAr: 'أطباق ساخنة', sortOrder: 1 } }),
    prisma.menuCategory.upsert({ where: { id: 'cat-grillades' }, update: {}, create: { id: 'cat-grillades', companyId: company.id, name: 'Grillades', nameAr: 'مشويات', sortOrder: 2 } }),
    prisma.menuCategory.upsert({ where: { id: 'cat-boissons' }, update: {}, create: { id: 'cat-boissons', companyId: company.id, name: 'Boissons', nameAr: 'مشروبات', sortOrder: 3 } }),
  ])

  // Menu items
  const menuItemsData = [
    { id: 'item-chorba', categoryId: catEntrees.id, name: 'Chorba', nameAr: 'شوربة', description: 'Soupe traditionnelle algérienne au mouton et vermicelles', price: 250, tags: ['populaire'], preparationTime: 5 },
    { id: 'item-salade', categoryId: catEntrees.id, name: 'Salade algérienne', nameAr: 'سلطة جزائرية', description: 'Tomates, concombres, poivrons, olives, menthe fraîche', price: 200, tags: ['végétarien'], preparationTime: 5 },
    { id: 'item-hrira', categoryId: catEntrees.id, name: 'Hrira', nameAr: 'هريرة', description: 'Soupe épaisse aux légumineuses et épices', price: 280, tags: ['populaire'], preparationTime: 10 },
    { id: 'item-couscous', categoryId: catPlats.id, name: 'Couscous Royal', nameAr: 'كسكس ملكي', description: 'Couscous à la semoule fine, mouton, merguez, légumes de saison', price: 1200, tags: ['populaire'], preparationTime: 20 },
    { id: 'item-tajine', categoryId: catPlats.id, name: 'Tajine Zitoune', nameAr: 'طاجين الزيتون', description: 'Poulet mijoté aux olives, citron confit et épices', price: 950, tags: [], preparationTime: 25 },
    { id: 'item-chakhchoukha', categoryId: catPlats.id, name: 'Chakhchoukha', nameAr: 'شخشوخة', description: 'Galette brisée au bouillon de viande et pois chiches', price: 800, tags: ['nouveau'], preparationTime: 15 },
    { id: 'item-brochettes', categoryId: catGrillades.id, name: 'Brochettes Mixtes', nameAr: 'مشاوي مشكلة', description: '3 brochettes mouton + 2 merguez + accompagnements', price: 1100, tags: ['populaire'], preparationTime: 20 },
    { id: 'item-kebab', categoryId: catGrillades.id, name: 'Kebab Maison', nameAr: 'كباب', description: 'Viande hachée épicée grillée, sauce tomate maison', price: 750, tags: ['épicé'], preparationTime: 15 },
    { id: 'item-poulet', categoryId: catGrillades.id, name: 'Poulet Rôti 1/2', nameAr: 'دجاج مشوي', description: 'Demi-poulet mariné aux épices algériennes, frites et salade', price: 900, tags: [], preparationTime: 25 },
    { id: 'item-jus-orange', categoryId: catBoissons.id, name: 'Jus d\'orange frais', nameAr: 'عصير برتقال', description: 'Pressé à la commande', price: 300, tags: ['nouveau'], preparationTime: 5 },
    { id: 'item-cafe', categoryId: catBoissons.id, name: 'Café Maure', nameAr: 'قهوة', description: 'Café à la cardamome et rose', price: 150, tags: [], preparationTime: 3 },
    { id: 'item-the', categoryId: catBoissons.id, name: 'Thé à la menthe', nameAr: 'شاي بالنعناع', description: 'Thé vert à la menthe fraîche', price: 200, tags: ['végétarien'], preparationTime: 5 },
    { id: 'item-eau', categoryId: catBoissons.id, name: 'Eau minérale', nameAr: 'ماء معدني', description: '50cl', price: 100, tags: [], preparationTime: 1 },
    { id: 'item-lben', categoryId: catBoissons.id, name: 'Lben', nameAr: 'لبن', description: 'Lait fermenté frais 25cl', price: 120, tags: [], preparationTime: 1 },
    { id: 'item-kalb', categoryId: catEntrees.id, name: 'Kalb el louz', nameAr: 'قلب اللوز', description: 'Gâteau traditionnel à la semoule et amandes', price: 180, tags: ['nouveau'], preparationTime: 2 },
  ]
  for (const item of menuItemsData) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id, companyId: company.id, categoryId: item.categoryId,
        name: item.name, nameAr: item.nameAr, description: item.description,
        price: item.price, taxRate: 19, preparationTime: item.preparationTime,
        tags: item.tags, sortOrder: menuItemsData.indexOf(item),
      },
    })
  }

  // Ingredients
  const ingredientData = [
    { id: 'ing-mouton', name: 'Mouton (kg)', unit: 'kg', currentStock: 15, minStock: 5, unitCost: 2000 },
    { id: 'ing-poulet', name: 'Poulet (kg)', unit: 'kg', currentStock: 20, minStock: 8, unitCost: 650 },
    { id: 'ing-semoule', name: 'Semoule fine (kg)', unit: 'kg', currentStock: 50, minStock: 10, unitCost: 120 },
    { id: 'ing-tomates', name: 'Tomates (kg)', unit: 'kg', currentStock: 8, minStock: 5, unitCost: 100 },
    { id: 'ing-olives', name: 'Olives (kg)', unit: 'kg', currentStock: 3, minStock: 2, unitCost: 400 },
    { id: 'ing-oranges', name: 'Oranges (kg)', unit: 'kg', currentStock: 10, minStock: 5, unitCost: 80 },
    { id: 'ing-menthe', name: 'Menthe fraîche', unit: 'botte', currentStock: 5, minStock: 3, unitCost: 50 },
    { id: 'ing-cafe', name: 'Café (kg)', unit: 'kg', currentStock: 2, minStock: 1, unitCost: 1200 },
    { id: 'ing-the', name: 'Thé vert (kg)', unit: 'kg', currentStock: 1.5, minStock: 0.5, unitCost: 800 },
    { id: 'ing-pois-chiches', name: 'Pois chiches (kg)', unit: 'kg', currentStock: 12, minStock: 3, unitCost: 200 },
  ]
  for (const ing of ingredientData) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: {},
      create: { ...ing, companyId: company.id },
    })
  }

  // Loyalty clients
  await Promise.all([
    prisma.loyaltyClient.upsert({
      where: { qrCode: 'LYL-demo-001' },
      update: {},
      create: { companyId: company.id, name: 'Karim Bensalem', phone: '0661000101', points: 1250, totalSpent: 12500, visitsCount: 15, tier: 'SILVER', qrCode: 'LYL-demo-001' },
    }),
    prisma.loyaltyClient.upsert({
      where: { qrCode: 'LYL-demo-002' },
      update: {},
      create: { companyId: company.id, name: 'Fatima Mansouri', phone: '0551000202', points: 3400, totalSpent: 34000, visitsCount: 42, tier: 'GOLD', qrCode: 'LYL-demo-002' },
    }),
    prisma.loyaltyClient.upsert({
      where: { qrCode: 'LYL-demo-003' },
      update: {},
      create: { companyId: company.id, name: 'Youcef Ouadah', phone: '0771000303', points: 280, totalSpent: 2800, visitsCount: 5, tier: 'STANDARD', qrCode: 'LYL-demo-003' },
    }),
  ])

  console.log('✅ Seed terminé. Email: demo@yelhaerp.dz / Password: Admin1234')
}

main().catch(console.error).finally(() => prisma.$disconnect())
