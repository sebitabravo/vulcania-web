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
    expect(APP_CONFIG).toHaveProperty('volcanoName')
  })

  it('should respect DEMO_MODE environment variable', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
    const { APP_CONFIG } = await import('../lib/app-config')
    expect(APP_CONFIG.demoMode).toBe(true)
  })

  it('should have valid volcano name', async () => {
    const { APP_CONFIG } = await import('../lib/app-config')
    expect(typeof APP_CONFIG.volcanoName).toBe('string')
    expect(APP_CONFIG.volcanoName.length).toBeGreaterThan(0)
  })
})
