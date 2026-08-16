/**
 * Tests para la configuración de la aplicación
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock de process.env
const originalEnv = process.env

describe('APP_CONFIG', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should export configuration object', async () => {
    const { APP_CONFIG } = await import('../lib/app-config')
    expect(APP_CONFIG).toBeDefined()
    expect(typeof APP_CONFIG).toBe('object')
  })

  it('should have required properties', async () => {
    const { APP_CONFIG } = await import('../lib/app-config')
    expect(APP_CONFIG).toHaveProperty('demoMode')
    expect(APP_CONFIG).toHaveProperty('demoPhone')
    expect(APP_CONFIG).toHaveProperty('demoReadOnly')
  })

  it('should respect DEMO_MODE environment variable', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
    const { APP_CONFIG } = await import('../lib/app-config')
    expect(APP_CONFIG.demoMode).toBe(true)
  })

  it('should have valid demo phone format', async () => {
    const { APP_CONFIG } = await import('../lib/app-config')
    expect(typeof APP_CONFIG.demoPhone).toBe('string')
    expect(APP_CONFIG.demoPhone.length).toBeGreaterThan(0)
  })

  it('habilita el panel demo por defecto para que el flujo insignia sea demostrable', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
    delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL
    const { APP_CONFIG } = await import('../lib/app-config')
    expect(APP_CONFIG.enableAdminPanel).toBe(true)
  })

  it('uses one resolver for explicit demo mode and Supabase fallback', async () => {
    const { resolveDemoMode } = await import('../lib/app-config')

    expect(resolveDemoMode({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    })).toBe(false)
    expect(resolveDemoMode({
      NEXT_PUBLIC_DEMO_MODE: 'true',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    })).toBe(true)
    expect(resolveDemoMode({})).toBe(true)
  })

  it('reads the default runtime configuration from public environment variables', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    const { APP_CONFIG, resolveDemoMode } = await import('../lib/app-config')

    expect(APP_CONFIG.demoMode).toBe(false)
    expect(resolveDemoMode()).toBe(false)
  })
})
