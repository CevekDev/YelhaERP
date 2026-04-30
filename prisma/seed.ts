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

  console.log('✅ Seed terminé. Email: demo@yelhaerp.dz / Password: Admin1234')
}

main().catch(console.error).finally(() => prisma.$disconnect())
