import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setCurrentMemberId } from '../../lib/platform/auth'
import { supabase } from '../../lib/supabase/client'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }

    const client = supabase

    void client.auth
      .exchangeCodeForSession(window.location.href)
      .then(async ({ error: authError }) => {
        if (authError) {
          setError(authError.message)
          return
        }

        const { data } = await client.rpc('link_group_member')
        if (typeof data === 'string') setCurrentMemberId(data)
        navigate('/', { replace: true })
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Sign-in failed')
      })
  }, [navigate])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6 text-center">
      <div>
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-outline-variant border-t-accent" />
        <p className="mt-4 m3-body-medium text-on-surface-variant">Finishing sign-in…</p>
        {error ? (
          <>
            <p className="mt-3 text-sm text-danger">{error}</p>
            <Link className="mt-4 inline-block m3-title-small text-accent" to="/">
              Back to sign-in
            </Link>
          </>
        ) : null}
      </div>
    </div>
  )
}
