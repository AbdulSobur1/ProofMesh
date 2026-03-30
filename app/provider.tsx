'use client'

import { SessionProvider } from 'next-auth/react'
import { ProofProvider } from '@/lib/proof-context'
import { ReactNode } from 'react'

export function Provider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ProofProvider>
        {children}
      </ProofProvider>
    </SessionProvider>
  )
}
