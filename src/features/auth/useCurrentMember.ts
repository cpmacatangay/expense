import { useSyncExternalStore } from 'react'
import { getCurrentMemberId, subscribeCurrentMember } from '../../lib/platform/auth'

export function useCurrentMemberId(): string | null {
  return useSyncExternalStore(subscribeCurrentMember, getCurrentMemberId, () => null)
}
