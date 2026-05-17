import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const idx = t.indexOf('=')
  if (idx === -1) continue
  const key = t.slice(0, idx).trim()
  const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  if (!process.env[key]) process.env[key] = val
}

const prisma = new PrismaClient()

async function main() {
  const companies = await prisma.company.findMany({
    include: { yelhaSubscription: true, appSubscriptions: true },
    take: 10,
  })

  console.log(`\n=== ${companies.length} company(ies) found ===`)
  for (const c of companies) {
    console.log(`\n• ${c.name} (${c.id})`)
    console.log(`  YelhaSubscription: ${c.yelhaSubscription ? `${c.yelhaSubscription.status} — plan=${c.yelhaSubscription.planId}` : 'NONE'}`)
    console.log(`  AppSubscriptions: ${c.appSubscriptions.map((a: any) => `${a.appId}=${a.status}`).join(', ') || 'none'}`)
  }

}

main().catch(console.error).finally(() => prisma.$disconnect())
