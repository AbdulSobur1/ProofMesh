import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateReputation } from '@/lib/services/reputation'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { PublicReputationExport, Proof } from '@/lib/types'

const toProof = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  sourceCategory: string
  artifactSummary: string | null
  evidenceItems: string
  profession: string
  proofType: string
  outcomeSummary: string | null
  score: number
  feedback: string | null
  tags: string
  txHash: string
  verificationStatus: string
  verificationConfidence: number
  verificationSignals: string
  verifiedAt: Date | null
  createdAt: Date
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  sourceCategory: proof.sourceCategory as Proof['sourceCategory'],
  artifactSummary: proof.artifactSummary,
  evidenceItems: [],
  profession: proof.profession,
  proofType: proof.proofType,
  outcomeSummary: proof.outcomeSummary,
  score: proof.score,
  feedback: proof.feedback,
  tags: parseTags(proof.tags),
  txHash: proof.txHash,
  verificationStatus: proof.verificationStatus,
  verificationConfidence: proof.verificationConfidence,
  verificationSignals: parseVerificationSignals(proof.verificationSignals),
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: [],
  endorsementCount: 0,
  createdAt: proof.createdAt.toISOString(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params
  const username = decodeURIComponent(rawUsername)
  const format = new URL(request.url).searchParams.get('format') ?? 'json'

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      headline: true,
      location: true,
      currentRole: true,
      currentCompany: true,
      walletAddress: true,
      trustLevel: true,
      identityVerifiedAt: true,
      createdAt: true,
      proofs: {
        orderBy: { score: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          link: true,
          sourceCategory: true,
          artifactSummary: true,
          evidenceItems: true,
          profession: true,
          proofType: true,
          outcomeSummary: true,
          score: true,
          feedback: true,
          tags: true,
          txHash: true,
          verificationStatus: true,
          verificationConfidence: true,
          verificationSignals: true,
          verifiedAt: true,
          createdAt: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const proofDtos = user.proofs.map(toProof)
  const reputation = calculateReputation(proofDtos)
  const exportPayload: PublicReputationExport = {
    profile: {
      username: user.username,
      displayName: user.displayName,
      headline: user.headline,
      location: user.location,
      currentRole: user.currentRole,
      currentCompany: user.currentCompany,
      walletAddress: user.walletAddress,
      trustLevel: user.trustLevel,
      identityVerifiedAt: user.identityVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    reputation,
    topSkills: reputation.tagFrequency.slice(0, 8),
    highlights: {
      strongestProofTitle: proofDtos[0]?.title ?? null,
      strongestProofScore: proofDtos[0]?.score ?? null,
      verifiedProofs: reputation.verifiedProofs,
      endorsementCount: reputation.endorsementCount,
    },
    proofs: proofDtos.map((proof) => ({
      id: proof.id,
      title: proof.title,
      proofType: proof.proofType,
      profession: proof.profession,
      score: proof.score,
      verificationStatus: proof.verificationStatus,
      verificationConfidence: proof.verificationConfidence,
      createdAt: proof.createdAt,
    })),
  }

  if (format === 'txt') {
    const lines = [
      `${user.displayName || user.username} (${user.username})`,
      user.headline || [user.currentRole, user.currentCompany].filter(Boolean).join(' at ') || 'Public reputation profile',
      '',
      `Average score: ${reputation.averageScore.toFixed(1)}/10`,
      `Verified proofs: ${reputation.verifiedProofs}`,
      `Average confidence: ${reputation.averageConfidence}%`,
      `Endorsements: ${reputation.endorsementCount}`,
      '',
      `Top skills: ${reputation.tagFrequency.slice(0, 6).map((item) => item.tag).join(', ') || 'None yet'}`,
      `Strongest proof: ${proofDtos[0]?.title ?? 'None yet'}`,
    ]

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${user.username}-reputation-summary.txt"`,
      },
    })
  }

  return NextResponse.json(exportPayload, {
    headers: {
      'Content-Disposition': `attachment; filename="${user.username}-reputation.json"`,
    },
  })
}
