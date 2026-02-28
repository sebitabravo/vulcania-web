/**
 * Tests básicos para reglas de autenticación de Vulcania
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import { APP_CONFIG } from '../lib/app-config'

describe('Auth rules', () => {
  it('should expose demo config', () => {
    expect(APP_CONFIG).toHaveProperty('demoMode')
    expect(APP_CONFIG).toHaveProperty('demoPhone')
  })

  it('should accept Chilean mobile format', () => {
    const validFormats = ['+56912345678', '+56 9 1234 5678', '+569 1234 5678']

    validFormats.forEach((format) => {
      expect(format).toMatch(/^\+56\s?9\s?[\d\s]+$/)
    })
  })

  it('should reject non-Chilean mobile format', () => {
    const invalidFormats = ['+54912345678', '912345678', '+5612345678']

    invalidFormats.forEach((format) => {
      expect(format).not.toMatch(/^\+56\s?9\s?[\d\s]+$/)
    })
  })

  it('should provide a demo phone with +56 prefix', () => {
    expect(APP_CONFIG.demoPhone.startsWith('+56')).toBe(true)
  })
})
