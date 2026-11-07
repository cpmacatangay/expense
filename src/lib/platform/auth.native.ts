import { SocialLogin } from '@capgo/capacitor-social-login'
import { supabase } from '../supabase/client'

/**
 * Native Google sign-in path.
 *
 * The returned member id is the Supabase group_members row linked to the
 * Google email. The full shared-data sync is intentionally staged behind the
 * Supabase feature flag; this adapter proves the native auth flow and keeps
 * the door open for the sync milestone.
 */
export async function signInWithGoogleNative(): Promise<string | null> {
  if (!supabase) throw new Error('Supabase is not configured')

  const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim()
  if (!webClientId) {
    throw new Error('VITE_GOOGLE_WEB_CLIENT_ID is missing')
  }

  await SocialLogin.initialize({
    google: {
      webClientId,
      iOSClientId: webClientId,
      iOSServerClientId: webClientId,
      mode: 'online',
      skipAuthOnlyAuthorizationAfterSignIn: true
    }
  })

  const login = await SocialLogin.login({ provider: 'google', options: {} })

  if (
    login.provider !== 'google' ||
    login.result.responseType !== 'online' ||
    !login.result.idToken
  ) {
    throw new Error('Google did not return an ID token')
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: login.result.idToken
  })
  if (error) throw error

  const { data } = await supabase.rpc('link_group_member')
  return typeof data === 'string' ? data : null
}
