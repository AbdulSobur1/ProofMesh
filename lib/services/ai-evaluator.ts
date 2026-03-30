import OpenAI from 'openai'
import { PROFESSION_LABELS, PROOF_TYPE_LABELS, type ProofProfession, type ProofType } from '@/lib/proof-taxonomy'

export interface EvaluationResult {
  score: number
  feedback: string
  tags: string[]
}

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIConfigurationError'
  }
}

export class AIEvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIEvaluationError'
  }
}

const buildPrompt = (input: {
  title: string
  description: string
  link?: string | null
  sourceCategory?: string
  profession: ProofProfession
  proofType: ProofType
  outcomeSummary?: string | null
}) => {
  return `
You are an expert professional evaluator. Assess the proof for quality, credibility, clarity, and measurable impact.
Return JSON only with this shape:
{"score":number,"feedback":"string","tags":["string","string"]}

Guidelines:
- Score must be between 0 and 10.
- Feedback should be concise (1-3 sentences).
- Consider craft quality, evidence strength, role clarity, and demonstrated impact.
- Tags should be short professional keywords (2-5 items).
- Respect the profession context. This proof may be technical, creative, operational, analytical, or communication-oriented.

Proof Context:
Profession: ${PROFESSION_LABELS[input.profession]}
Proof Type: ${PROOF_TYPE_LABELS[input.proofType]}
Evidence Type: ${input.sourceCategory ?? 'general'}
Title: ${input.title}
Description: ${input.description}
Outcome Summary: ${input.outcomeSummary ?? 'N/A'}
Link: ${input.link ?? 'N/A'}
`.trim()
}

const mockTagsByProfession: Record<ProofProfession, string[]> = {
  software_engineering: ['Frontend', 'Backend', 'System Design', 'Security', 'DevOps'],
  marketing: ['Campaign Strategy', 'Performance Marketing', 'Content', 'Growth', 'Analytics'],
  accounting_finance: ['Forecasting', 'Financial Analysis', 'Reporting', 'Controls', 'Compliance'],
  communication_pr: ['Stakeholder Communication', 'Messaging', 'PR Strategy', 'Writing', 'Crisis Response'],
  sales: ['Pipeline', 'Lead Generation', 'Negotiation', 'Account Growth', 'Closing'],
  operations: ['Process Design', 'Execution', 'Efficiency', 'Coordination', 'SOPs'],
  design: ['UX', 'Visual Design', 'Research', 'Prototyping', 'Design Systems'],
  product_management: ['Roadmapping', 'Prioritization', 'Discovery', 'Delivery', 'Stakeholder Alignment'],
  education: ['Curriculum', 'Learning Design', 'Assessment', 'Facilitation', 'Student Success'],
  general_business: ['Strategy', 'Analysis', 'Execution', 'Leadership', 'Operations'],
}

const mockFeedbackByProfession: Record<ProofProfession, string> = {
  software_engineering: 'Clear technical scope and implementation detail. Add stronger validation or measurable engineering impact to make the proof more convincing.',
  marketing: 'The submission shows a coherent campaign or growth story. Adding audience detail and harder outcome metrics would make the proof stronger.',
  accounting_finance: 'The work suggests strong analytical discipline and structure. Include more evidence of business or reporting impact where possible.',
  communication_pr: 'The proof shows clarity of message and audience awareness. A stronger before-and-after outcome would improve credibility.',
  sales: 'This reads like practical revenue or pipeline work. Stronger proof of conversion, deal movement, or customer outcome would improve the signal.',
  operations: 'The submission reflects process ownership and execution quality. Add measurable efficiency or reliability gains to sharpen the impact.',
  design: 'The work shows good design thinking and communication. A stronger connection to user or business outcomes would make it more persuasive.',
  product_management: 'The proof reflects prioritization and delivery thinking. Add clearer product decisions and measurable outcomes to strengthen it.',
  education: 'The submission suggests thoughtful learning or program design. More measurable learner outcomes would improve the overall strength.',
  general_business: 'The submission shows useful business judgment and structured execution. A clearer outcome or decision impact would improve the proof.',
}

const mockEvaluation = (profession: ProofProfession): EvaluationResult => {
  const tags = [...mockTagsByProfession[profession]].sort(() => Math.random() - 0.5).slice(0, 3)
  const score = Math.floor(Math.random() * 4) + 6
  return {
    score,
    feedback: mockFeedbackByProfession[profession],
    tags,
  }
}

const shouldAllowMockEvaluation = () => process.env.OPENAI_ALLOW_MOCK === 'true'

const getOpenAIConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  if (!apiKey) {
    if (shouldAllowMockEvaluation()) {
      return {
        apiKey: null,
        model,
        allowMock: true,
      }
    }

    throw new AIConfigurationError(
      'OpenAI is not configured. Set OPENAI_API_KEY, or set OPENAI_ALLOW_MOCK=true for local mock evaluation.'
    )
  }

  return {
    apiKey,
    model,
    allowMock: shouldAllowMockEvaluation(),
  }
}

const normalizeEvaluation = (parsed: EvaluationResult): EvaluationResult => {
  if (
    typeof parsed.score !== 'number' ||
    typeof parsed.feedback !== 'string' ||
    !Array.isArray(parsed.tags)
  ) {
    throw new AIEvaluationError('The AI response did not match the expected evaluation format.')
  }

  const normalizedTags = parsed.tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 5)

  if (normalizedTags.length === 0) {
    throw new AIEvaluationError('The AI response did not return any usable tags.')
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(parsed.score))),
    feedback: parsed.feedback.trim(),
    tags: normalizedTags,
  }
}

export const evaluateProof = async (input: {
  title: string
  description: string
  link?: string | null
  sourceCategory?: string
  profession: ProofProfession
  proofType: ProofType
  outcomeSummary?: string | null
}): Promise<EvaluationResult> => {
  const config = getOpenAIConfig()

  if (!config.apiKey) {
    return mockEvaluation(input.profession)
  }

  try {
    const openai = new OpenAI({
      apiKey: config.apiKey,
    })

    const response = await openai.chat.completions.create({
      model: config.model,
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
      throw new AIEvaluationError('The AI response was empty.')
    }

    const parsed = JSON.parse(content) as EvaluationResult
    return normalizeEvaluation(parsed)
  } catch (error) {
    if (config.allowMock) {
      return mockEvaluation(input.profession)
    }

    if (error instanceof AIConfigurationError || error instanceof AIEvaluationError) {
      throw error
    }

    throw new AIEvaluationError('OpenAI evaluation is temporarily unavailable.')
  }
}
