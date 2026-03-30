export type TagFrequency = {
  tag: string
  count: number
}

export type VerificationSignal = {
  label: string
  strength: 'low' | 'medium' | 'high'
}

export type PeerVerificationRelationship = 'peer' | 'client' | 'manager' | 'collaborator'

export type PeerVerification = {
  id: string
  verifierName: string
  verifierRole: string | null
  verifierCompany: string | null
  relationship: PeerVerificationRelationship
  message: string
  createdAt: string
}

export type Reputation = {
  averageScore: number
  totalProofs: number
  tagFrequency: TagFrequency[]
  verifiedProofs: number
  averageConfidence: number
  endorsementCount: number
}

export type Proof = {
  id: string
  title: string
  description: string
  link: string | null
  profession: string
  proofType: string
  outcomeSummary: string | null
  score: number
  feedback: string | null
  tags: string[]
  txHash: string
  verificationStatus: string
  verificationConfidence: number
  verificationSignals: VerificationSignal[]
  verifiedAt: string | null
  endorsements: PeerVerification[]
  endorsementCount: number
  createdAt: string
  userId?: string
}

export type ProfessionalProfile = {
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
  createdAt: string
}

export type ProfileUser = {
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
  createdAt: string
} | null

export type ProfileResponse = {
  user: ProfileUser
  proofs: Proof[]
  reputation: Reputation
}

export type ProofDetailResponse = {
  proof: Proof | null
  user: ProfileUser
  reputation: Reputation
}

export type SessionUser = {
  id: string
  username: string
  displayName: string | null
  headline: string | null
  location: string | null
  avatarUrl: string | null
  currentRole: string | null
  currentCompany: string | null
  createdAt: string
  email?: string | null
  walletAddress?: string | null
}

export type MeResponse = {
  user: SessionUser | null
}

export type UpdateProfileInput = {
  displayName: string
  headline: string
  bio: string
  location: string
  websiteUrl: string
  avatarUrl: string
  currentRole: string
  currentCompany: string
  yearsExperience: string
}

export type ProofSortMode = 'newest' | 'oldest' | 'highest' | 'lowest'
export type DiscoverySortMode = 'trust' | 'score' | 'proofs' | 'endorsements'

export type DiscoveryCandidate = {
  id: string
  username: string
  createdAt: string
  primaryProfession: string | null
  reputation: Reputation
  topTags: string[]
  proofTypes: string[]
  strongestProof: {
    id: string
    title: string
    score: number
  } | null
  isSaved: boolean
  savedAt: string | null
}

export type DiscoveryResponse = {
  candidates: DiscoveryCandidate[]
}

export type RoleMatchBreakdown = {
  profession: number
  skillTags: number
  proofTypes: number
  trust: number
  proofQuality: number
}

export type RoleMatch = {
  candidate: DiscoveryCandidate
  matchScore: number
  matchedTags: string[]
  matchedProofTypes: string[]
  breakdown: RoleMatchBreakdown
}

export type RoleMatchResponse = {
  role: {
    slug: string
    label: string
    description: string
    profession: string
    targetTags: string[]
    preferredProofTypes: string[]
    minScore: number
  }
  matches: RoleMatch[]
}

export type JobPost = {
  id: string
  title: string
  description: string
  profession: string
  targetTags: string[]
  preferredProofTypes: string[]
  minScore: number
  createdAt: string
  updatedAt: string
}

export type JobPostsResponse = {
  jobs: JobPost[]
}

export type JobMatchResponse = {
  job: JobPost
  matches: RoleMatch[]
}
