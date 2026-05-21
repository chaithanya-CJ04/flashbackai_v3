'use client'

import { useEffect } from 'react'
import { setTokens, extractUserIdFromToken } from '../hooks/useAuth'

function extractTokenFromUrl(): string | null {
  const keys = ['access_token', 'token', 'jwt', 'id_token']
  const extract = (src: string) => {
    const params = new URLSearchParams(src)
    for (const k of keys) {
      if (params.has(k)) return params.get(k)
    }
    return null
  }
  const { hash, search } = window.location
  if (hash) {
    const t = extract(hash.startsWith('#') ? hash.slice(1) : hash)
    if (t) return t
  }
  if (search) {
    const t = extract(search.startsWith('?') ? search.slice(1) : search)
    if (t) return t
  }
  return null
}

export default function AuthRedirect() {
  useEffect(() => {
    const href = window.location.href
    const hash = window.location.hash
    const search = window.location.search
    console.log('[/auth] page loaded', { href, hash, search })

    const token = extractTokenFromUrl()
    console.log('[/auth] token found:', !!token, token ? token.substring(0, 40) + '...' : 'NONE')

    if (token) {
      const userId = extractUserIdFromToken(token)
      console.log('[/auth] userId from token:', userId)
      setTokens({ accessToken: token, userId: userId ?? undefined })
      console.log('[/auth] tokens stored in localStorage — navigating to /legacies')
      window.location.replace('/legacies')
    } else {
      console.log('[/auth] no token in URL — forwarding to /login with:', search + hash)
      window.location.replace('/login' + search + hash)
    }
  }, [])

  return null
}
