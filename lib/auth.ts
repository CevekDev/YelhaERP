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

// Override createUser to create YelhaSubscription for new Google/OAuth users
function createCustomAdapter(): Adapter {
  const base = PrismaAdapter(prisma) as Adapter
  return {
    ...base,
    async createUser(user: Omit<AdapterUser, 'id'>) {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 15)

      const newUser = await prisma.user.create({
        data: {
          email:         user.email,
          name:          user.name ?? 'Utilisateur',
          password:      null,
          emailVerified: user.emailVerified ?? new Date(),
          role:          'OWNER',
          plan:          'TRIAL',
          trialEndsAt,
        },
      })

      // Create YelhaSubscription (essai 15j)
      await prisma.yelhaSubscription.create({
        data: {
          userId:             newUser.id,
          planId:             'trial',
          status:             'TRIAL',
          trialEndsAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd:   trialEndsAt,
        },
      }).catch(() => {})

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
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.password)
        if (!isValid) return null

        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')

        return {
          id:          user.id,
          email:       user.email,
          name:        user.name,
          role:        user.role,
          plan:        user.plan,
          isSuperAdmin: user.isSuperAdmin,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === 'update' && session) {
        if (session.plan) token.plan = session.plan
        return token
      }
      if (user) {
        token.id = user.id as string

        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id as string },
          })
          if (dbUser) {
            token.role         = dbUser.role
            token.isSuperAdmin = dbUser.isSuperAdmin
            token.plan         = dbUser.plan
          }
        } else {
          token.role         = (user as { role: Role }).role
          token.isSuperAdmin = (user as { isSuperAdmin: boolean }).isSuperAdmin ?? false
          token.plan         = (user as { plan: string }).plan
        }
        token.roleRefreshedAt = Date.now()
      }

      // Rafraîchir rôle + plan depuis la DB toutes les 5 minutes
      const FIVE_MIN = 5 * 60 * 1000
      const lastRefresh = (token.roleRefreshedAt as number | undefined) ?? 0
      if (token.id && Date.now() - lastRefresh > FIVE_MIN) {
        const dbUser = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { role: true, isSuperAdmin: true, plan: true },
        })
        if (dbUser) {
          token.role         = dbUser.role
          token.isSuperAdmin = dbUser.isSuperAdmin
          token.plan         = dbUser.plan
        }
        token.roleRefreshedAt = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id           = token.id as string
        session.user.role         = token.role as Role
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) ?? false
        session.user.plan         = token.plan as string
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
  const hierarchy: Record<Role, number> = { OWNER: 5, ADMIN: 4, EMPLOYEE: 2, READONLY: 1 }
  if (hierarchy[session.user.role] < hierarchy[minRole]) throw new Error('FORBIDDEN')
  return session
}
