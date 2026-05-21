import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
}

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`

  const apiPrefix = '/api/v1'
  if (b.endsWith(apiPrefix) && p.startsWith(`${apiPrefix}/`)) {
    return `${b}${p.slice(apiPrefix.length)}`
  }

  return `${b}${p}`
}

async function proxy(req: Request, pathParts: string[]) {
  const base = getApiBase()
  if (!base) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_API_BASE' }, { status: 500 })
  }

  const incomingUrl = new URL(req.url)
  const targetUrl = joinUrl(base, pathParts.join('/')) + incomingUrl.search

  const headers = new Headers(req.headers)

  headers.set('origin', incomingUrl.origin)
  headers.set('referer', incomingUrl.origin)
  headers.set('X-Forwarded-Host', incomingUrl.host)
  headers.set('X-Forwarded-Proto', incomingUrl.protocol.replace(':', ''))

  headers.delete('connection')
  headers.delete('keep-alive')
  headers.delete('proxy-authenticate')
  headers.delete('proxy-authorization')
  headers.delete('te')
  headers.delete('trailers')
  headers.delete('transfer-encoding')
  headers.delete('upgrade')
  headers.delete('content-length')

  const method = req.method.toUpperCase()
  const hasBody = !(method === 'GET' || method === 'HEAD')

  const init: RequestInit = {
    method,
    headers,
    body: hasBody ? (req.body as any) : undefined,
    redirect: 'manual',
  }

  if (hasBody) {
    ;(init as any).duplex = 'half'
  }

  const upstreamRes = await fetch(targetUrl, init as any)

  const resHeaders = new Headers(upstreamRes.headers)
  resHeaders.delete('content-encoding')

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  })
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const params = await (ctx.params as any)
  return proxy(req, params.path || [])
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const params = await (ctx.params as any)
  return proxy(req, params.path || [])
}

export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const params = await (ctx.params as any)
  return proxy(req, params.path || [])
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const params = await (ctx.params as any)
  return proxy(req, params.path || [])
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const params = await (ctx.params as any)
  return proxy(req, params.path || [])
}

export async function OPTIONS(req: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const params = await (ctx.params as any)
  return proxy(req, params.path || [])
}
