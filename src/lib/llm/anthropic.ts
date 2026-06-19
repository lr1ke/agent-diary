import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey } from '@/lib/config/env'

let _client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!_client) {
    const apiKey = getAnthropicApiKey()
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
    _client = new Anthropic({ apiKey })
  }
  return _client
}
