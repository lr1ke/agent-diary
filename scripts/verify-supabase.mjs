/**
 * Verify Supabase connection and that migrations were applied.
 * Loads .env* from project root and src/ (matches Next.js + next.config.ts).
 *
 * Usage: npm run db:verify
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nextEnv from '@next/env'
const { loadEnvConfig } = nextEnv
import { createClient } from '@supabase/supabase-js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(root)
loadEnvConfig(path.join(root, 'src'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

function fail(msg, hint) {
  console.error(`\n✗ ${msg}`)
  if (hint) console.error(hint)
  process.exit(1)
}

if (!url || url.includes('your-project.supabase.co')) {
  fail('Set NEXT_PUBLIC_SUPABASE_URL in .env.local (real project URL)')
}
if (!anon || anon === 'eyJ...') {
  fail('Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}
if (!service || service === 'eyJ...') {
  fail('Set SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

for (const table of ['agents', 'diary_entries']) {
  const { error } = await admin.from(table).select('*').limit(1)
  if (error) {
    console.error(`\n✗ Table "${table}" (service_role): ${error.message}`)
    if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
      console.error('\n  Migration not applied yet. Run supabase/migrations/001_init.sql')
      console.error('  in Supabase Dashboard → SQL Editor → New query → Run\n')
    }
    process.exit(1)
  }
  console.log(`✓ table "${table}" exists (service_role)`)
}

const anonClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})

for (const table of ['agents', 'diary_entries']) {
  const { error } = await anonClient.from(table).select('id').limit(1)
  if (error) {
    if (error.code === 'PGRST205') {
      fail(
        `anon cannot see "${table}" (PGRST205 — missing GRANT or stale schema cache)`,
        [
          '',
          '  Run supabase/migrations/002_api_grants.sql in SQL Editor, then retry.',
          '  (GRANT alone is not enough — the file ends with NOTIFY pgrst reload.)',
          '',
        ].join('\n'),
      )
    }
    fail(`anon read on "${table}": ${error.message}`)
  }
  console.log(`✓ anon can read "${table}"`)
}

console.log('\n✓ Supabase is configured and migrated\n')
