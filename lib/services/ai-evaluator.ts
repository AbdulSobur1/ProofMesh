import OpenAI from 'openai'
import { PROFESSION_LABELS, PROOF_TYPE_LABELS, type ProofProfession, type ProofType } from '@/lib/proof-taxonomy'

export interface EvaluationResult {
  score: number
  feedback: string
  tags: string[]
}

const buildPrompt = (input: {
  title: string
  description: string
  link?: string | null
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

export const evaluateProof = async (input: {
  title: string
  description: string
  link?: string | null
  profession: ProofProfession
  proofType: ProofType
  outcomeSummary?: string | null
}): Promise<EvaluationResult> => {
  if (!process.env.OPENAI_API_KEY) {
    return mockEvaluation(input.profession)
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
      return mockEvaluation(input.profession)
    }

    const parsed = JSON.parse(content) as EvaluationResult
    if (
      typeof parsed.score !== 'number' ||
      typeof parsed.feedback !== 'string' ||
      !Array.isArray(parsed.tags)
    ) {
      return mockEvaluation(input.profession)
    }

    return {
      score: Math.max(0, Math.min(10, Math.round(parsed.score))),
      feedback: parsed.feedback.trim(),
      tags: parsed.tags.map((tag) => String(tag).trim()).filter(Boolean),
    }
  } catch {
    return mockEvaluation(input.profession)
  }
}
