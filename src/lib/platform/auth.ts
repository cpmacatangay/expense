import { Capacitor } from '@capacitor/core'
import { isSupabaseConfigured, supabase } from '../supabase/client'

const STORAGE_KEY = 'salo.currentMemberId'
const listeners = new Set<() => void>()

let currentMemberId: string | null =
  typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)

function emit(): void {
  for (const listener of listeners) listener()
}

export function getCurrentMemberId(): string | null {
  return currentMemberId
}

export function setCurrentMemberId(memberId: string | null): void {
  currentMemberId = memberId
  if (typeof localStorage !== 'undefined') {
    if (memberId) localStorage.setItem(STORAGE_KEY, memberId)
    else localStorage.removeItem(STORAGE_KEY)
  }
  emit()
}

export function subscribeCurrentMember(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) {
    throw new Error('Google sign-in is not configured. Add Supabase environment values.')
  }

  if (Capacitor.isNativePlatform()) {
    const { signInWithGoogleNative } = await import('./auth.native')
    const memberId = await signInWithGoogleNative()
    if (memberId) setCurrentMemberId(memberId)
    return
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut()
  }
  setCurrentMemberId(null)
}
