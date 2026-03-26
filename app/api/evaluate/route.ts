import { NextResponse } from 'next/server'
import { z } from 'zod'
import { evaluateProof } from '@/lib/services/ai-evaluator'

const evaluateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  link: z.string().url().optional().or(z.literal('')),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = evaluateSchema.parse(body)

    const result = await evaluateProof({
      title: input.title,
      description: input.description,
      link: input.link || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid request payload',
      },
      { status: 400 }
    )
  }
}
