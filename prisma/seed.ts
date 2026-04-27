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
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.user.upsert({
    where: { email: 'demo@yelhaerp.dz' },
    update: {},
    create: {
      email: 'demo@yelhaerp.dz',
      password: hash,
      name: 'Utilisateur Demo',
      role: 'OWNER',
      companyId: company.id,
    },
  })

  console.log('Seed terminé. Email: demo@yelhaerp.dz / Password: Admin1234')
}

main().catch(console.error).finally(() => prisma.$disconnect())
