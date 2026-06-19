/**
 * Global test setup — runs before every test file.
 * Injects environment variables so modules that read process.env at import
 * time don't throw on missing values.
 */
import { afterEach, vi } from 'vitest'

// ── Environment stubs ─────────────────────────────────────────────────────────
process.env.ANTHROPIC_API_KEY          = 'sk-ant-test-key'
process.env.SELLER_ADDRESS             = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
process.env.SELLER_PRIVATE_KEY         = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
process.env.NEXT_PUBLIC_SUPABASE_URL   = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY  = 'test-service-role-key'

// ── Global mock resets ────────────────────────────────────────────────────────
afterEach(() => {
  vi.clearAllMocks()
})
