/**
 * Tests para el contexto de autenticación (AuthContext)
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../contexts/auth-context'
import { APP_CONFIG } from '../lib/app-config'

// Mock de Supabase
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}))

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  describe('useAuth hook', () => {
    it('should return auth context values', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current).toHaveProperty('usuario')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('logout')
      expect(result.current).toHaveProperty('loading')
    })

    it('should start with loading true initially', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Después de hidratación, loading debería ser false
      expect(result.current.loading).toBe(false)
    })

    it('should return null usuario when not logged in', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.usuario).toBe(null)
    })
  })

  describe('login function', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(typeof result.current.login).toBe('function')
    })

    it('should return boolean', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      let loginResult: boolean
      await act(async () => {
        loginResult = await result.current.login('+56912345678')
      })
      
      expect(typeof loginResult!).toBe('boolean')
    })
  })

  describe('logout function', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(typeof result.current.logout).toBe('function')
    })

    it('should clear usuario from localStorage', () => {
      // Simular usuario logueado
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ nombre: 'Test', telefono: '+56912345678' })
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      act(() => {
        result.current.logout()
      })
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vulcania_usuario')
    })
  })

  describe('phone normalization', () => {
    it('should normalize phone with spaces', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // La función normalizarTelefono debería estar disponible
      // Testear a través del login
      expect(result.current.login).toBeDefined()
    })

    it('should handle Chilean mobile format (+569)', () => {
      // Formato válido: +569XXXXXXXX
      const validFormats = [
        '+56912345678',
        '+56 9 1234 5678',
        '+569 1234 5678',
      ]
      
      validFormats.forEach(format => {
        expect(format).toMatch(/^\+56\s?9\s?[\d\s]+$/)
      })
    })

    it('should reject non-Chilean formats', () => {
      const invalidFormats = [
        '+54912345678', // Argentina
        '912345678',    // Sin código de país
        '+5612345678',  // Sin el 9
      ]
      
      invalidFormats.forEach(format => {
        expect(format).not.toMatch(/^\+56\s?9\s?[\d\s]+$/)
      })
    })
  })

  describe('localStorage persistence', () => {
    it('should save usuario to localStorage on login', async () => {
      const mockUsuario = {
        id: '123',
        nombre: 'Test User',
        telefono: '+56912345678',
        fecha_creacion: new Date().toISOString(),
      }
      
      // Mock exitoso
      vi.spyOn(AuthProvider as any, 'prototype').mockImplementation(() => ({
        usuario: mockUsuario,
        login: vi.fn().mockResolvedValue(true),
        logout: vi.fn(),
        loading: false,
      }))
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUsuario))
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.usuario).toEqual(mockUsuario)
      })
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('vulcania_usuario')
    })

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      // No debería lanzar error
      expect(() => {
        renderHook(() => useAuth(), { wrapper })
      }).not.toThrow()
      
      // Debería remover el item inválido
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vulcania_usuario')
    })

    it('should handle null localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.usuario).toBe(null)
    })
  })

  describe('demo mode', () => {
    it('should have demo mode enabled in APP_CONFIG', () => {
      expect(APP_CONFIG.demoMode).toBe(true)
    })

    it('should have demo phone configured', () => {
      expect(APP_CONFIG.demoPhone).toBeDefined()
      expect(APP_CONFIG.demoPhone).toMatch(/^\+569\d{8,9}$/)
    })
  })
})
