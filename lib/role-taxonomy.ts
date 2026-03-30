export const ROLE_PROFILES = {
  frontend_engineer: {
    label: 'Frontend Engineer',
    profession: 'software_engineering',
    targetTags: ['react', 'typescript', 'ui', 'frontend', 'performance', 'accessibility'],
    preferredProofTypes: ['project', 'portfolio_piece', 'case_study'],
    minScore: 7.5,
    description: 'Great for product-facing engineers who can ship polished interfaces with strong technical quality.',
  },
  product_marketer: {
    label: 'Product Marketer',
    profession: 'marketing',
    targetTags: ['go-to-market', 'campaign', 'positioning', 'content', 'growth', 'analytics'],
    preferredProofTypes: ['campaign', 'case_study', 'presentation'],
    minScore: 7,
    description: 'Designed for candidates who can connect product narrative, messaging, and measurable market outcomes.',
  },
  operations_lead: {
    label: 'Operations Lead',
    profession: 'operations',
    targetTags: ['operations', 'workflow', 'efficiency', 'process', 'delivery', 'systems'],
    preferredProofTypes: ['process_improvement', 'report', 'analysis'],
    minScore: 7,
    description: 'Highlights operators who improve systems, reduce friction, and create reliable repeatable execution.',
  },
  product_manager: {
    label: 'Product Manager',
    profession: 'product_management',
    targetTags: ['roadmap', 'prioritization', 'stakeholders', 'analytics', 'user-research', 'strategy'],
    preferredProofTypes: ['case_study', 'analysis', 'presentation'],
    minScore: 7.2,
    description: 'Best for candidates who show product thinking, prioritization, stakeholder alignment, and measurable outcomes.',
  },
  sales_manager: {
    label: 'Sales Manager',
    profession: 'sales',
    targetTags: ['pipeline', 'outreach', 'conversion', 'revenue', 'crm', 'negotiation'],
    preferredProofTypes: ['case_study', 'presentation', 'analysis'],
    minScore: 7,
    description: 'Surfaces candidates with real pipeline influence, sales process discipline, and commercial outcomes.',
  },
  finance_analyst: {
    label: 'Finance Analyst',
    profession: 'accounting_finance',
    targetTags: ['forecasting', 'reporting', 'budgeting', 'financial-modeling', 'analysis', 'controls'],
    preferredProofTypes: ['report', 'analysis', 'case_study'],
    minScore: 7.3,
    description: 'Built for candidates who can turn financial detail into actionable insight and dependable reporting.',
  },
  brand_designer: {
    label: 'Brand Designer',
    profession: 'design',
    targetTags: ['branding', 'visual-design', 'research', 'ux', 'identity', 'storytelling'],
    preferredProofTypes: ['portfolio_piece', 'case_study', 'presentation'],
    minScore: 7,
    description: 'Highlights designers whose proof shows intentional visual systems, rationale, and business impact.',
  },
  communications_manager: {
    label: 'Communications Manager',
    profession: 'communication_pr',
    targetTags: ['messaging', 'stakeholders', 'pr', 'communications', 'strategy', 'campaign'],
    preferredProofTypes: ['presentation', 'campaign', 'case_study'],
    minScore: 7,
    description: 'For candidates who can craft clear messaging, manage reputation, and influence stakeholder outcomes.',
  },
} as const

export type RoleSlug = keyof typeof ROLE_PROFILES
export const ROLE_SLUGS = Object.keys(ROLE_PROFILES) as RoleSlug[]
