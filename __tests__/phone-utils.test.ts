import { describe, expect, it } from 'vitest'
import { formatTelefonoInput, isValidChileanMobile } from '@/lib/phone-utils'

describe('phone-utils', () => {
  it('formatea número chileno al escribir', () => {
    expect(formatTelefonoInput('12345678', '+56 9 ')).toBe('+56 9 1234 5678')
  })

  it('mantiene prefijo cuando se borra demasiado', () => {
    expect(formatTelefonoInput('+5', '+56 9 1234')).toBe('+56 9 ')
  })

  it('valida formato móvil chileno correcto', () => {
    const result = isValidChileanMobile('+56 9 1234 5678')
    expect(result.valid).toBe(true)
  })

  it('rechaza número sin 9 móvil', () => {
    const result = isValidChileanMobile('+56 2 1234 5678')
    expect(result.valid).toBe(false)
  })
})
