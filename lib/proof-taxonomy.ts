export const PROOF_PROFESSIONS = [
  'software_engineering',
  'marketing',
  'accounting_finance',
  'communication_pr',
  'sales',
  'operations',
  'design',
  'product_management',
  'education',
  'general_business',
] as const

export const PROOF_TYPES = [
  'project',
  'case_study',
  'campaign',
  'report',
  'presentation',
  'process_improvement',
  'analysis',
  'portfolio_piece',
] as const

export type ProofProfession = (typeof PROOF_PROFESSIONS)[number]
export type ProofType = (typeof PROOF_TYPES)[number]

export const PROFESSION_LABELS: Record<ProofProfession, string> = {
  software_engineering: 'Software Engineering',
  marketing: 'Marketing',
  accounting_finance: 'Accounting & Finance',
  communication_pr: 'Communication & PR',
  sales: 'Sales',
  operations: 'Operations',
  design: 'Design',
  product_management: 'Product Management',
  education: 'Education',
  general_business: 'General Business',
}

export const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  project: 'Project',
  case_study: 'Case Study',
  campaign: 'Campaign',
  report: 'Report',
  presentation: 'Presentation',
  process_improvement: 'Process Improvement',
  analysis: 'Analysis',
  portfolio_piece: 'Portfolio Piece',
}

export const PROFESSION_GUIDANCE: Record<
  ProofProfession,
  {
    titlePlaceholder: string
    descriptionPlaceholder: string
    outcomePlaceholder: string
    tips: string[]
  }
> = {
  software_engineering: {
    titlePlaceholder: 'Built a secure React component library',
    descriptionPlaceholder: 'Describe what you built, the stack you used, the hard parts, and how the implementation was verified.',
    outcomePlaceholder: 'Improved delivery speed by 30% across three product squads.',
    tips: ['Mention your architecture decisions.', 'Include implementation details or links.', 'Explain how you measured technical impact.'],
  },
  marketing: {
    titlePlaceholder: 'Led a product launch campaign for a fintech app',
    descriptionPlaceholder: 'Explain the audience, channel mix, strategy, execution, and what results the campaign produced.',
    outcomePlaceholder: 'Drove 18,000 landing page visits and a 6.4% conversion rate.',
    tips: ['Include campaign goals and audience.', 'Mention channels, messaging, and assets.', 'Share measurable outcomes like reach, CTR, CAC, or conversions.'],
  },
  accounting_finance: {
    titlePlaceholder: 'Built a monthly cash-flow forecasting model',
    descriptionPlaceholder: 'Describe the reporting or finance problem, your methodology, controls, and how the deliverable improved decisions.',
    outcomePlaceholder: 'Reduced month-end reporting time by 40% and improved forecast accuracy.',
    tips: ['Explain the financial problem clearly.', 'Show controls, accuracy, or compliance impact.', 'Use anonymized metrics where needed.'],
  },
  communication_pr: {
    titlePlaceholder: 'Created a crisis communication response plan',
    descriptionPlaceholder: 'Explain the communication challenge, target stakeholders, messaging strategy, and how the work was executed.',
    outcomePlaceholder: 'Improved stakeholder response time and reduced escalation volume.',
    tips: ['State the audience and communication goal.', 'Highlight messaging choices and tone.', 'Show evidence of reach, clarity, or sentiment impact.'],
  },
  sales: {
    titlePlaceholder: 'Built a B2B outbound sequence for mid-market leads',
    descriptionPlaceholder: 'Describe the sales motion, customer segment, sales assets, and the commercial impact of the work.',
    outcomePlaceholder: 'Raised qualified meetings by 22% over six weeks.',
    tips: ['Describe the segment and sales context.', 'Explain your process or pitch strategy.', 'Include pipeline or conversion outcomes.'],
  },
  operations: {
    titlePlaceholder: 'Redesigned the customer onboarding workflow',
    descriptionPlaceholder: 'Explain the process problem, your new workflow, operational constraints, and how performance improved.',
    outcomePlaceholder: 'Cut onboarding time from 5 days to 2 days.',
    tips: ['Map the before-and-after process.', 'Highlight execution discipline.', 'Include efficiency, cost, or quality outcomes.'],
  },
  design: {
    titlePlaceholder: 'Designed a mobile checkout flow for higher conversion',
    descriptionPlaceholder: 'Describe the user problem, research, design decisions, and how the final solution performed.',
    outcomePlaceholder: 'Raised checkout completion by 11% after launch.',
    tips: ['Explain the problem and design rationale.', 'Mention research or testing.', 'Include usability or business impact.'],
  },
  product_management: {
    titlePlaceholder: 'Defined and launched an internal workflow feature',
    descriptionPlaceholder: 'Describe the user need, prioritization logic, execution plan, and how the release affected the product.',
    outcomePlaceholder: 'Reduced support tickets by 25% after rollout.',
    tips: ['Show decision-making and prioritization.', 'Mention stakeholders and tradeoffs.', 'Include product or business outcomes.'],
  },
  education: {
    titlePlaceholder: 'Created a learner support program for new students',
    descriptionPlaceholder: 'Describe the learning problem, the intervention you built, how it was delivered, and the observed learner outcomes.',
    outcomePlaceholder: 'Increased completion rates by 14% over one term.',
    tips: ['Explain the learner context.', 'Mention how delivery and assessment worked.', 'Share outcome data where possible.'],
  },
  general_business: {
    titlePlaceholder: 'Delivered a strategic case study for market expansion',
    descriptionPlaceholder: 'Describe the business challenge, your approach, the work product, and the measurable impact of the result.',
    outcomePlaceholder: 'Helped leadership prioritize the top 2 expansion markets.',
    tips: ['Focus on the business problem.', 'Explain how the work was carried out.', 'Show the decision or impact it influenced.'],
  },
}
