'use client'

import { ProofProvider } from '@/lib/proof-context'
import { ReactNode } from 'react'

export function Provider({ children }: { children: ReactNode }) {
  return (
    <ProofProvider>
      {children}
    </ProofProvider>
  )
}
