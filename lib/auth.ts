import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Role } from '@prisma/client'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 }, // 7 jours
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { company: { select: { id: true, name: true, plan: true, businessType: true } } },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company.name,
          plan: user.company.plan,
          businessType: user.company.businessType,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: Role }).role
        token.companyId = (user as { companyId: string }).companyId
        token.companyName = (user as { companyName: string }).companyName
        token.plan = (user as { plan: string }).plan
        token.businessType = (user as { businessType: string }).businessType
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.companyId = token.companyId as string
        session.user.companyName = token.companyName as string
        session.user.plan = token.plan as string
        session.user.businessType = token.businessType as string
      }
      return session
    },
  },
})

// Helper pour récupérer la session côté serveur avec vérification
export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

// Helper pour vérifier le rôle minimum requis
export async function requireRole(minRole: Role) {
  const session = await requireAuth()
  const roleHierarchy: Record<Role, number> = {
    OWNER: 5,
    ADMIN: 4,
    ACCOUNTANT: 3,
    EMPLOYEE: 2,
    READONLY: 1,
  }
  if (roleHierarchy[session.user.role] < roleHierarchy[minRole]) {
    throw new Error('FORBIDDEN')
  }
  return session
}
