import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Role } from '@prisma/client'
import type { Adapter, AdapterUser } from 'next-auth/adapters'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1).max(128),
})

// Override createUser to create Company for new Google/OAuth users
function createCustomAdapter(): Adapter {
  const base = PrismaAdapter(prisma) as Adapter
  return {
    ...base,
    async createUser(user: Omit<AdapterUser, 'id'>) {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 10)

      const company = await prisma.company.create({
        data: {
          name: user.name ? `Entreprise de ${user.name.split(' ')[0]}` : 'Mon Entreprise',
          plan: 'TRIAL',
          trialEndsAt,
        },
      })

      const newUser = await prisma.user.create({
        data: {
          email:         user.email,
          name:          user.name ?? 'Utilisateur',
          password:      null,
          emailVerified: user.emailVerified ?? new Date(),
          role:          'OWNER',
          companyId:     company.id,
        },
      })

      // Send welcome email (non-blocking)
      import('@/lib/email/resend').then(({ sendWelcomeEmail }) =>
        sendWelcomeEmail(newUser.email, newUser.name).catch(() => {})
      )

      return { ...newUser, emailVerified: newUser.emailVerified ?? null } as AdapterUser
    },
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createCustomAdapter(),
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where:   { email: parsed.data.email },
          include: { company: { select: { id: true, name: true, plan: true, businessType: true } } },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.password)
        if (!isValid) return null

        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')

        return {
          id:           user.id,
          email:        user.email,
          name:         user.name,
          role:         user.role,
          companyId:    user.companyId,
          companyName:  user.company.name,
          plan:         user.company.plan,
          businessType: user.company.businessType,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id as string

        // For Google/OAuth: fetch company info from DB
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where:   { id: user.id as string },
            include: { company: true },
          })
          if (dbUser) {
            token.role         = dbUser.role
            token.companyId    = dbUser.companyId
            token.companyName  = dbUser.company.name
            token.plan         = dbUser.company.plan
            token.businessType = dbUser.company.businessType
          }
        } else {
          token.role         = (user as { role: Role }).role
          token.companyId    = (user as { companyId: string }).companyId
          token.companyName  = (user as { companyName: string }).companyName
          token.plan         = (user as { plan: string }).plan
          token.businessType = (user as { businessType: string }).businessType
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id           = token.id as string
        session.user.role         = token.role as Role
        session.user.companyId    = token.companyId as string
        session.user.companyName  = token.companyName as string
        session.user.plan         = token.plan as string
        session.user.businessType = token.businessType as string
      }
      return session
    },
  },
})

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')
  return session
}

export async function requireRole(minRole: Role) {
  const session = await requireAuth()
  const hierarchy: Record<Role, number> = { OWNER: 5, ADMIN: 4, ACCOUNTANT: 3, EMPLOYEE: 2, READONLY: 1 }
  if (hierarchy[session.user.role] < hierarchy[minRole]) throw new Error('FORBIDDEN')
  return session
}
