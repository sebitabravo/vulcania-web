import { describe, expect, it } from 'vitest'
import {
  formatTelefonoInput,
  isValidChileanMobile,
  normalizePhoneSpaces,
} from '@/lib/phone-utils'

describe('phone-utils production helpers', () => {
  it('normaliza espacios sin alterar el número', () => {
    expect(normalizePhoneSpaces('  +56 9 1234 5678  ')).toBe('+56912345678')
  })

  it('formatea el número canónico al escribir', () => {
    expect(formatTelefonoInput('12345678', '+56 9 ')).toBe('+56 9 1234 5678')
  })

  it('acepta exactamente ocho dígitos después de +569', () => {
    expect(isValidChileanMobile('+56 9 1234 5678').valid).toBe(true)
    expect(isValidChileanMobile('+5691234567').valid).toBe(false)
    expect(isValidChileanMobile('+569123456789').valid).toBe(false)
  })

  it('rechaza números no móviles chilenos', () => {
    expect(isValidChileanMobile('+56 2 1234 5678').valid).toBe(false)
    expect(isValidChileanMobile('+54912345678').valid).toBe(false)
  })
})
