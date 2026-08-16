/**
 * Regresiones para el flujo de AuthProvider en demo offline.
 *
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '@/contexts/auth-context'

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthProvider demo', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('restaura el estado sin sesión y rechaza un teléfono inválido', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      expect(await result.current.login('+56 9 1234')).toBe(false)
    })

    expect(result.current.usuario).toBeNull()
    expect(result.current.authError).toMatch(/8 dígitos/i)
  })

  it('entra con un teléfono demo válido y cierra la sesión local', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      expect(await result.current.login('+56 9 1234 5678')).toBe(true)
    })

    expect(result.current.usuario?.telefono).toBe('+56912345678')
    expect(window.sessionStorage.getItem('vulcania_demo_session')).toContain('demo-')

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.usuario).toBeNull()
    expect(window.sessionStorage.getItem('vulcania_demo_session')).toBeNull()
  })
})
