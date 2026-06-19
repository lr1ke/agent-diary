import { NextResponse, type NextRequest } from 'next/server'
import type {
  GatewayMiddleware,
  PaymentRequest,
  PaymentResponse,
} from '@circle-fin/x402-batching/server'

type ExpressMiddleware = ReturnType<GatewayMiddleware['require']>

/**
 * Run Circle's Express middleware inside a Next.js Route Handler.
 * Resolves once the middleware calls next() (payment OK) or writes a response (402, etc.).
 */
export function runExpressMiddleware(
  middleware: ExpressMiddleware,
  req: NextRequest,
  onSuccess: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const expressReq = {
      method:  req.method,
      url:     req.url,
      headers: Object.fromEntries(req.headers.entries()),
      body:    undefined as unknown,
    } as unknown as PaymentRequest

    let statusCode = 200
    const resHeaders: Record<string, string> = {}

    const expressRes = {
      status(code: number) {
        statusCode = code
        return expressRes
      },
      set(key: string, value: string) {
        resHeaders[key] = value
        return expressRes
      },
      json(body: unknown) {
        resolve(NextResponse.json(body, { status: statusCode, headers: resHeaders }))
      },
      send(body: string) {
        resolve(new NextResponse(body, { status: statusCode, headers: resHeaders }))
      },
      end() {
        resolve(new NextResponse(null, { status: statusCode, headers: resHeaders }))
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
