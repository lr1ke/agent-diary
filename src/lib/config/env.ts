import type { GatewayMiddlewareConfig } from '@circle-fin/x402-batching/server'

const PLACEHOLDER_SUPABASE_HOST = 'your-project.supabase.co'

/** True when URL and key are set and not .env.example placeholders. */
export function isSupabaseConfigured(url?: string, key?: string): boolean {
  if (!url || !key || key === 'eyJ...') return false
  try {
    return !new URL(url).hostname.includes(PLACEHOLDER_SUPABASE_HOST)
  } catch {
    return false
  }
}

/** Circle Gateway middleware config — see developers.circle.com/gateway/nanopayments */
export function getGatewayMiddlewareConfig(): GatewayMiddlewareConfig {
  const sellerAddress = process.env.SELLER_ADDRESS
  const config: GatewayMiddlewareConfig = {
    sellerAddress: sellerAddress && sellerAddress !== '0x...' ? sellerAddress : 'unconfigured',
    description:   'Agent Diary API — USDC micropayments via Circle Gateway x402',
  }

  const facilitatorUrl = process.env.CIRCLE_GATEWAY_URL
  if (facilitatorUrl && facilitatorUrl.startsWith('http')) {
    config.facilitatorUrl = facilitatorUrl
  }

  return config
}

export function getAnthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === 'sk-ant-...') return undefined
  return key
}
