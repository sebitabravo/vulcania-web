/**
 * Tests para las funciones de normalización de teléfono en auth-context
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

// Funciones extraídas del auth-context para testear
function normalizarTelefono(telefono: string): string {
  return telefono.replace(/\s/g, "").trim()
}

function generarVariantesBusqueda(telefono: string): string[] {
  const base = telefono.replace(/\s/g, "").trim()
  const variantes = [base]

  // Caso 1: Si el número es +569XXXXXXXX (con 9), generar +56XXXXXXXX (sin el primer 9)
  if (base.match(/^\+569\d{8,9}$/)) {
    const sinPrimerNueve = base.replace(/^\+569/, "+56")
    variantes.push(sinPrimerNueve)
  }

  // Caso 2: Si el número es +56XXXXXXX (sin 9), generar +569XXXXXXX (con 9)
  if (base.match(/^\+56\d{8,9}$/) && !base.startsWith("+569")) {
    const conNueve = base.replace(/^\+56/, "+569")
    variantes.push(conNueve)
  }

  // Caso 3: Si el número es +569XXXXXXXXX (con 9 y 9+ dígitos)
  if (base.match(/^\+569\d{9,}$/)) {
    const digitosDespuesNueve = base.substring(4, 12)
    const formatoCorto = "+569" + digitosDespuesNueve
    const formatoSinNueve = "+56" + digitosDespuesNueve
    variantes.push(formatoCorto)
    variantes.push(formatoSinNueve)
  }

  return [...new Set(variantes)]
}

describe('normalizarTelefono', () => {
  it('should remove spaces from phone number', () => {
    expect(normalizarTelefono('+56 9 1234 5678')).toBe('+56912345678')
  })

  it('should trim whitespace', () => {
    expect(normalizarTelefono('  +56912345678  ')).toBe('+56912345678')
  })

  it('should handle multiple spaces', () => {
    expect(normalizarTelefono('+56  9  1234  5678')).toBe('+56912345678')
  })

  it('should return same string if no spaces', () => {
    expect(normalizarTelefono('+56912345678')).toBe('+56912345678')
  })
})

describe('generarVariantesBusqueda', () => {
  it('should generate variant without 9 for +569 numbers', () => {
    const variantes = generarVariantesBusqueda('+56912345678')
    expect(variantes).toContain('+56912345678')
    expect(variantes).toContain('+5612345678')
  })

  it('should generate variant with 9 for +56 numbers', () => {
    const variantes = generarVariantesBusqueda('+5612345678')
    expect(variantes).toContain('+5612345678')
    expect(variantes).toContain('+56912345678')
  })

  it('should handle numbers with spaces', () => {
    const variantes = generarVariantesBusqueda('+56 9 1234 5678')
    expect(variantes).toContain('+56912345678')
    expect(variantes).toContain('+5612345678')
  })

  it('should remove duplicates', () => {
    const variantes = generarVariantesBusqueda('+56912345678')
    const unique = new Set(variantes)
    expect(variantes.length).toBe(unique.size)
  })

  it('should handle 9-digit numbers after +569', () => {
    const variantes = generarVariantesBusqueda('+569123456789')
    expect(variantes.length).toBeGreaterThan(1)
  })
})
