export type TagFrequency = {
  tag: string
  count: number
}

export type Reputation = {
  averageScore: number
  totalProofs: number
  tagFrequency: TagFrequency[]
}

export type Proof = {
  id: string
  title: string
  description: string
  link: string | null
  score: number
  feedback: string | null
  tags: string[]
  txHash: string
  createdAt: string
  userId?: string
}

export type ProfileUser = {
  id: string
  username: string
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
  createdAt: string
  email?: string | null
  walletAddress?: string | null
}

export type MeResponse = {
  user: SessionUser | null
}

export type ProofSortMode = 'newest' | 'oldest' | 'highest' | 'lowest'
