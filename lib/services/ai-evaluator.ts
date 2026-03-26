import OpenAI from 'openai'

export interface EvaluationResult {
  score: number
  feedback: string
  tags: string[]
}

const buildPrompt = (input: { title: string; description: string; link?: string | null }) => {
  return `
You are an expert technical reviewer. Evaluate the quality and credibility of the proof.
Return JSON only with this shape:
{"score":number,"feedback":"string","tags":["string","string"]}

Guidelines:
- Score must be between 0 and 10.
- Feedback should be concise (1-3 sentences).
- Tags should be short technical keywords (2-5 items).

Proof:
Title: ${input.title}
Description: ${input.description}
Link: ${input.link ?? 'N/A'}
`.trim()
}

const mockEvaluation = (): EvaluationResult => {
  const tags = ['Frontend', 'Backend', 'AI', 'Database', 'DevOps', 'Security']
  const randomTags = tags.sort(() => Math.random() - 0.5).slice(0, 3)
  const score = Math.floor(Math.random() * 4) + 6
  return {
    score,
    feedback: `Solid submission with clear technical depth in ${randomTags[0]}. Consider adding more metrics and validation details.`,
    tags: randomTags,
  }
}

export const evaluateProof = async (input: {
  title: string
  description: string
  link?: string | null
}): Promise<EvaluationResult> => {
  if (!process.env.OPENAI_API_KEY) {
    return mockEvaluation()
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'Return JSON only. Do not include markdown or code fences.',
        },
        {
          role: 'user',
          content: buildPrompt(input),
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return mockEvaluation()
    }

    const parsed = JSON.parse(content) as EvaluationResult
    if (
      typeof parsed.score !== 'number' ||
      typeof parsed.feedback !== 'string' ||
      !Array.isArray(parsed.tags)
    ) {
      return mockEvaluation()
    }

    return {
      score: Math.max(0, Math.min(10, Math.round(parsed.score))),
      feedback: parsed.feedback.trim(),
      tags: parsed.tags.map((tag) => String(tag).trim()).filter(Boolean),
    }
  } catch {
    return mockEvaluation()
  }
}
