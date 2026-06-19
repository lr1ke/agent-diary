import type { NextConfig } from 'next'
import path from 'path'
import { loadEnvConfig } from '@next/env'
import { patchBrokenNodeLocalStorage } from './src/lib/runtime/fix-local-storage'

// Load .env* from src/ (not project root)
loadEnvConfig(path.join(__dirname, 'src'))

// Patch before any module initialisation touches globalThis.localStorage
patchBrokenNodeLocalStorage()

const nextConfig: NextConfig = {
  serverExternalPackages: ['@circle-fin/x402-batching'],
}

export default nextConfig
