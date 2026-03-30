import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AIConfigurationError, AIEvaluationError, evaluateProof } from '@/lib/services/ai-evaluator'
import { PROOF_PROFESSIONS, PROOF_TYPES } from '@/lib/proof-taxonomy'

const evaluateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  link: z.string().url().optional().or(z.literal('')),
  profession: z.enum(PROOF_PROFESSIONS),
  proofType: z.enum(PROOF_TYPES),
  outcomeSummary: z.string().max(240).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = evaluateSchema.parse(body)

    const result = await evaluateProof({
      title: input.title,
      description: input.description,
      link: input.link || undefined,
      profession: input.profession,
      proofType: input.proofType,
      outcomeSummary: input.outcomeSummary || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request payload',
        },
        { status: 400 }
      )
    }

    if (error instanceof AIConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    if (error instanceof AIEvaluationError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    return NextResponse.json(
      {
        error: 'Failed to evaluate proof',
      },
      { status: 500 }
    )
  }
}
