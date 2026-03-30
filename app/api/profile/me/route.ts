import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

const listItemIdSchema = z.string().trim().max(80)

const workExperienceSchema = z.object({
  id: listItemIdSchema,
  title: z.string().trim().max(120),
  company: z.string().trim().max(120),
  location: z.string().trim().max(80),
  startDate: z.string().trim().max(40),
  endDate: z.string().trim().max(40),
  isCurrent: z.boolean(),
  description: z.string().trim().max(500),
})

const educationSchema = z.object({
  id: listItemIdSchema,
  school: z.string().trim().max(120),
  degree: z.string().trim().max(120),
  fieldOfStudy: z.string().trim().max(120),
  startDate: z.string().trim().max(40),
  endDate: z.string().trim().max(40),
  description: z.string().trim().max(400),
})

const certificationSchema = z.object({
  id: listItemIdSchema,
  name: z.string().trim().max(120),
  issuer: z.string().trim().max(120),
  issueDate: z.string().trim().max(40),
  credentialUrl: z.string().trim().url().or(z.literal('')),
})

const claimedSkillSchema = z.object({
  id: listItemIdSchema,
  name: z.string().trim().max(60),
})

const updateProfileSchema = z.object({
  displayName: z.string().trim().max(80),
  headline: z.string().trim().max(140),
  bio: z.string().trim().max(600),
  location: z.string().trim().max(80),
  websiteUrl: z.string().trim().url().or(z.literal('')),
  avatarUrl: z.string().trim().url().or(z.literal('')),
  currentRole: z.string().trim().max(80),
  currentCompany: z.string().trim().max(80),
  yearsExperience: z.string().trim().regex(/^\d{0,2}$/),
  workExperiences: z.array(workExperienceSchema).max(12),
  educations: z.array(educationSchema).max(8),
  certifications: z.array(certificationSchema).max(12),
  claimedSkills: z.array(claimedSkillSchema).max(30),
})

const toProfile = (user: {
  id: string
  username: string
  displayName: string | null
  headline: string | null
  bio: string | null
  location: string | null
  websiteUrl: string | null
  avatarUrl: string | null
  currentRole: string | null
  currentCompany: string | null
  yearsExperience: number | null
  createdAt: Date
}) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  headline: user.headline,
  bio: user.bio,
  location: user.location,
  websiteUrl: user.websiteUrl,
  avatarUrl: user.avatarUrl,
  currentRole: user.currentRole,
  currentCompany: user.currentCompany,
  yearsExperience: user.yearsExperience,
  createdAt: user.createdAt.toISOString(),
})

const toWorkExperience = (entry: {
  id: string
  title: string
  company: string
  location: string | null
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string | null
}) => ({
  id: entry.id,
  title: entry.title,
  company: entry.company,
  location: entry.location,
  startDate: entry.startDate,
  endDate: entry.endDate,
  isCurrent: entry.isCurrent,
  description: entry.description,
})

const toEducation = (entry: {
  id: string
  school: string
  degree: string
  fieldOfStudy: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
}) => ({
  id: entry.id,
  school: entry.school,
  degree: entry.degree,
  fieldOfStudy: entry.fieldOfStudy,
  startDate: entry.startDate,
  endDate: entry.endDate,
  description: entry.description,
})

const toCertification = (entry: {
  id: string
  name: string
  issuer: string
  issueDate: string | null
  credentialUrl: string | null
}) => ({
  id: entry.id,
  name: entry.name,
  issuer: entry.issuer,
  issueDate: entry.issueDate,
  credentialUrl: entry.credentialUrl,
})

const toClaimedSkill = (entry: { id: string; name: string }) => ({
  id: entry.id,
  name: entry.name,
})

async function getSignedInUser(request: Request) {
  const token = await getCurrentToken(request)
  const userId = token?.sub

  if (!userId) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      workExperiences: {
        orderBy: { displayOrder: 'asc' },
      },
      educations: {
        orderBy: { displayOrder: 'asc' },
      },
      certifications: {
        orderBy: { displayOrder: 'asc' },
      },
      claimedSkills: {
        orderBy: { displayOrder: 'asc' },
      },
      proofs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function GET(request: Request) {
  const user = await getSignedInUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    user: toProfile(user),
    workExperiences: user.workExperiences.map(toWorkExperience),
    educations: user.educations.map(toEducation),
    certifications: user.certifications.map(toCertification),
    claimedSkills: user.claimedSkills.map(toClaimedSkill),
  })
}

export async function PATCH(request: Request) {
  const user = await getSignedInUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = updateProfileSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: input.displayName || null,
        headline: input.headline || null,
        bio: input.bio || null,
        location: input.location || null,
        websiteUrl: input.websiteUrl || null,
        avatarUrl: input.avatarUrl || null,
        currentRole: input.currentRole || null,
        currentCompany: input.currentCompany || null,
        yearsExperience: input.yearsExperience ? Number(input.yearsExperience) : null,
        workExperiences: {
          deleteMany: {},
          create: input.workExperiences
            .filter((entry) => entry.title && entry.company && entry.startDate)
            .map((entry, index) => ({
              title: entry.title,
              company: entry.company,
              location: entry.location || null,
              startDate: entry.startDate,
              endDate: entry.isCurrent ? null : entry.endDate || null,
              isCurrent: entry.isCurrent,
              description: entry.description || null,
              displayOrder: index,
            })),
        },
        educations: {
          deleteMany: {},
          create: input.educations
            .filter((entry) => entry.school && entry.degree)
            .map((entry, index) => ({
              school: entry.school,
              degree: entry.degree,
              fieldOfStudy: entry.fieldOfStudy || null,
              startDate: entry.startDate || null,
              endDate: entry.endDate || null,
              description: entry.description || null,
              displayOrder: index,
            })),
        },
        certifications: {
          deleteMany: {},
          create: input.certifications
            .filter((entry) => entry.name && entry.issuer)
            .map((entry, index) => ({
              name: entry.name,
              issuer: entry.issuer,
              issueDate: entry.issueDate || null,
              credentialUrl: entry.credentialUrl || null,
              displayOrder: index,
            })),
        },
        claimedSkills: {
          deleteMany: {},
          create: input.claimedSkills
            .filter((entry) => entry.name)
            .map((entry, index) => ({
              name: entry.name.toLowerCase(),
              displayOrder: index,
            })),
        },
      },
      include: {
        workExperiences: {
          orderBy: { displayOrder: 'asc' },
        },
        educations: {
          orderBy: { displayOrder: 'asc' },
        },
        certifications: {
          orderBy: { displayOrder: 'asc' },
        },
        claimedSkills: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    return NextResponse.json({
      user: toProfile(updatedUser),
      workExperiences: updatedUser.workExperiences.map(toWorkExperience),
      educations: updatedUser.educations.map(toEducation),
      certifications: updatedUser.certifications.map(toCertification),
      claimedSkills: updatedUser.claimedSkills.map(toClaimedSkill),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid profile payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
