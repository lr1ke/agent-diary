import { NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class DbNotConfiguredError extends ApiError {
  constructor() {
    super('Database not configured', 503)
    this.name = 'DbNotConfiguredError'
  }
}

export class DbQueryError extends ApiError {
  constructor(message: string, cause?: unknown) {
    super(message, 500)
    this.name = 'DbQueryError'
    if (cause) console.error('[agent-diary]', message, cause)
  }
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error('[agent-diary] unexpected error:', err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
