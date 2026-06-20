import { NextResponse, type NextRequest } from 'next/server'
import type {
  GatewayMiddleware,
  PaymentRequest,
  PaymentResponse,
} from '@circle-fin/x402-batching/server'

type ExpressMiddleware = ReturnType<GatewayMiddleware['require']>

/**
 * Run Circle's x402 middleware inside a Next.js Route Handler.
 * Circle uses Node http.ServerResponse (statusCode, setHeader, end) — not Express res.json().
 */
export function runExpressMiddleware(
  middleware: ExpressMiddleware,
  req: NextRequest,
  onSuccess: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const expressReq = {
      method:  req.method,
      url:     req.nextUrl.pathname + req.nextUrl.search,
      headers: Object.fromEntries(req.headers.entries()),
    } as unknown as PaymentRequest

    const resHeaders: Record<string, string> = {}

    const expressRes = {
      statusCode: 200,
      setHeader(name: string, value: string) {
        resHeaders[name] = value
      },
      end(body?: string) {
        resolve(new NextResponse(body ?? null, { status: expressRes.statusCode, headers: resHeaders }))
      },
      // Express-style fallbacks (unused by Circle middleware today)
      status(code: number) {
        expressRes.statusCode = code
        return expressRes
      },
      set(key: string, value: string) {
        resHeaders[key] = value
        return expressRes
      },
      json(body: unknown) {
        if (!resHeaders['Content-Type']) {
          resHeaders['Content-Type'] = 'application/json'
        }
        resolve(NextResponse.json(body, { status: expressRes.statusCode, headers: resHeaders }))
      },
      send(body: string) {
        resolve(new NextResponse(body, { status: expressRes.statusCode, headers: resHeaders }))
      },
    } as unknown as PaymentResponse

    void middleware(expressReq, expressRes, () => {
      onSuccess()
        .then(resolve)
        .catch((err: unknown) => {
          console.error('[agent-diary] handler error:', err)
          resolve(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
        })
    })
  })
}
