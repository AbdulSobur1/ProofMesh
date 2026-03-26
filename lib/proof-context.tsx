"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut as nextSignOut } from 'next-auth/react'
import { MeResponse, ProfileResponse, Proof, Reputation, SessionUser } from '@/lib/types'
import { type ProofProfession, type ProofType } from '@/lib/proof-taxonomy'

interface AddProofInput {
  title: string
  description: string
  link?: string
  profession: ProofProfession
  proofType: ProofType
  outcomeSummary?: string
}

interface ProofContextType {
  currentUser: SessionUser | null
  proofs: Proof[]
  reputation: Reputation
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  addProof: (proof: AddProofInput) => Promise<Proof>
  signOut: () => Promise<void>
}

const ProofContext = createContext<ProofContextType | undefined>(undefined)

const emptyReputation: Reputation = {
  averageScore: 0,
  totalProofs: 0,
  tagFrequency: [],
  verifiedProofs: 0,
  averageConfidence: 0,
}

export const ProofProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [proofs, setProofs] = useState<Proof[]>([])
  const [reputation, setReputation] = useState<Reputation>(emptyReputation)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (username: string) => {
    const response = await fetch(`/api/profile/${encodeURIComponent(username)}`, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Failed to load profile data')
    }

    const payload = (await response.json()) as ProfileResponse
    setProofs(payload.proofs)
    setReputation(payload.reputation)
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load session')
      }

      const payload = (await response.json()) as MeResponse
      setCurrentUser(payload.user)

      if (payload.user) {
        await loadProfile(payload.user.username)
      } else {
        setProofs([])
        setReputation(emptyReputation)
      }
    } catch (err) {
      setCurrentUser(null)
      setProofs([])
      setReputation(emptyReputation)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [loadProfile])

  useEffect(() => {
    refresh()
  }, [refresh, pathname])

  const addProof = async (proof: AddProofInput): Promise<Proof> => {
    const response = await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: proof.title,
        description: proof.description,
        link: proof.link,
        profession: proof.profession,
        proofType: proof.proofType,
        outcomeSummary: proof.outcomeSummary,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error ?? 'Failed to submit proof')
    }

    const payload = (await response.json()) as { proof: Proof }
    if (currentUser) {
      await loadProfile(currentUser.username)
    }
    return payload.proof
  }

  const signOut = async () => {
    await Promise.all([
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => null),
      nextSignOut({ callbackUrl: '/' }),
    ])
    setCurrentUser(null)
    setProofs([])
    setReputation(emptyReputation)
    router.push('/')
    router.refresh()
  }

  return (
    <ProofContext.Provider
      value={{
        currentUser,
        proofs,
        reputation,
        isLoading,
        error,
        refresh,
        addProof,
        signOut,
      }}
    >
      {children}
    </ProofContext.Provider>
  )
}

export const useProofs = () => {
  const context = useContext(ProofContext)
  if (!context) {
    throw new Error('useProofs must be used within ProofProvider')
  }
  return context
}
