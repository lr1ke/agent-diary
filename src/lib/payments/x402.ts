/**
 * Next.js adapter for Circle Gateway x402 nanopayments.
 *
 * @see https://developers.circle.com/gateway/nanopayments/references/sdk
 * @see https://developers.circle.com/gateway/nanopayments/quickstarts/seller
 */
import type { GatewayMiddleware } from '@circle-fin/x402-batching/server'
import { NextRequest, NextResponse } from 'next/server'
import { getGatewayMiddlewareConfig } from '@/lib/config/env'
import { runExpressMiddleware } from '@/lib/payments/express-shim'

export type RouteHandler = (req: NextRequest) => Promise<NextResponse>

let _gateway: GatewayMiddleware | null = null

async function getGateway(): Promise<GatewayMiddleware> {
  if (!_gateway) {
    const { createGatewayMiddleware } = await import('@circle-fin/x402-batching/server')
    _gateway = createGatewayMiddleware(getGatewayMiddlewareConfig())
  }
  return _gateway
}

/**
 * Gate a route handler behind Circle Gateway x402 payment verification.
 *
 * @param price  USD amount, e.g. `'$0.001'` (see `gateway.require()` in Circle SDK)
 */
export function withPayment(price: string, handler: RouteHandler): RouteHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    const gateway = await getGateway()
    return runExpressMiddleware(gateway.require(price), req, () => handler(req))
  }
}
