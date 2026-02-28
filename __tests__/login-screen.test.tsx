/**
 * Tests básicos para LoginScreen de Vulcania
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginScreen from '../components/login-screen'

const mockLogin = vi.fn()

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: vi.fn(),
    usuario: null,
    loading: false,
  }),
}))

vi.mock('@/lib/app-config', () => ({
  APP_CONFIG: {
    demoMode: true,
    demoPhone: '+56 9 1234 5678',
  },
}))

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza cabecera principal', () => {
    render(<LoginScreen />)
    expect(screen.getByText(/VOLCANO/i)).toBeInTheDocument()
    expect(screen.getAllByText(/EMERGENCIA/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Acceso con SMS/i)).toBeInTheDocument()
  })

  it('renderiza input de teléfono y botones', () => {
    render(<LoginScreen />)
    expect(screen.getByPlaceholderText('+56 9 1234 5678')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar código SMS/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acceso Directo/i })).toBeInTheDocument()
  })

  it('mantiene atributos de accesibilidad del input', () => {
    render(<LoginScreen />)
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    expect(phoneInput).toHaveAttribute('required')
    expect(phoneInput).toHaveAttribute('autoComplete', 'tel')
  })

  it('permite escribir y formatear teléfono', async () => {
    const user = userEvent.setup()
    render(<LoginScreen />)

    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    await user.type(phoneInput, '12345678')

    expect(String((phoneInput as HTMLInputElement).value)).toContain('+56 9')
  })
})
