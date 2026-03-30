import { getServerSession, type NextAuthOptions } from 'next-auth'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { getToken } from 'next-auth/jwt'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/services/password'
import { verifyEmailVerificationChallenge } from '@/lib/services/email-verification'

const SESSION_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? 'proofmesh-dev-secret'

function getChallengeCookie(req: any) {
  const cookieHeader = req?.headers?.cookie ?? ''
  const match = cookieHeader.match(/proofmesh_email_challenge=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export const authOptions: NextAuthOptions = {
  secret: SESSION_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email verification',
      credentials: {
        identifier: { label: 'Email', type: 'email' },
        code: { label: 'Verification code', type: 'text' },
      },
      async authorize(credentials, req) {
        const email = credentials?.identifier?.trim().toLowerCase()
        const code = credentials?.code?.trim()

        if (!email || !code) {
          return null
        }

        const challengeToken = getChallengeCookie(req)
        if (!challengeToken) {
          return null
        }

        const loginVerification = verifyEmailVerificationChallenge(challengeToken, email, code, 'login')
        const signupVerification = verifyEmailVerificationChallenge(challengeToken, email, code, 'signup')

        if (!loginVerification.ok && !signupVerification.ok) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: email },
        })

        if (!user) {
          return null
        }

        return {
          id: user.id,
          name: user.username,
          email: user.username,
          username: user.username,
        } as any
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'apple') {
        const email = user.email?.trim().toLowerCase()
        if (!email) {
          return false
        }

        const existing = await prisma.user.findUnique({
          where: { username: email },
        })

        const resolvedUser = existing
          ? await prisma.user.update({
              where: { id: existing.id },
              data: {
                displayName: user.name?.trim() || existing.displayName,
                avatarUrl: user.image || existing.avatarUrl,
              },
            })
          : await prisma.user.create({
              data: {
                username: email,
                passwordHash: await hashPassword(randomUUID()),
                displayName: user.name?.trim() || null,
                avatarUrl: user.image || null,
              },
            })

        ;(user as any).id = resolvedUser.id
        ;(user as any).username = resolvedUser.username
        ;(user as any).name = resolvedUser.displayName ?? user.name
        ;(user as any).image = resolvedUser.avatarUrl ?? user.image
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.name = user.name ?? token.name
        token.email = user.email ?? token.email
        token.username = (user as any).username ?? token.username
      }

      const lookupUsername =
        typeof token.username === 'string'
          ? token.username
          : typeof token.email === 'string'
            ? token.email
            : null
      if (lookupUsername) {
        const dbUser = await prisma.user.findUnique({ where: { username: lookupUsername } })
        if (dbUser) {
          token.sub = dbUser.id
          token.username = dbUser.username
          token.name = dbUser.displayName ?? token.name
          token.picture = dbUser.avatarUrl ?? token.picture
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).username = token.username ?? session.user.email ?? 'builder'
        session.user.name = token.name ?? session.user.name
        session.user.email = token.email ?? session.user.email
        session.user.image = typeof token.picture === 'string' ? token.picture : session.user.image
      }
      return session
    },
  },
}

export async function getCurrentToken(request: Request) {
  return getToken({
    req: request as any,
    secret: SESSION_SECRET,
  })
}



