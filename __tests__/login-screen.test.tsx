/**
 * Tests básicos para LoginScreen de Vulcania
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginScreen from '../components/login-screen'
import { AlertProvider } from '../contexts/alert-context'

const mockLogin = vi.fn()
const mockVerifyOtp = vi.fn()
const mockClearPendingOtp = vi.fn()

function renderLogin() {
  return render(
    <AlertProvider>
      <LoginScreen />
    </AlertProvider>
  )
}

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    login: mockLogin,
    verifyOtp: mockVerifyOtp,
    pendingPhone: null,
    authError: '',
    clearPendingOtp: mockClearPendingOtp,
    logout: vi.fn(),
    usuario: null,
    loading: false,
  }),
}))

vi.mock('@/lib/app-config', () => ({
  APP_CONFIG: {
    demoMode: true,
    demoPhone: '+56 9 1234 5678',
    defaultVolcanoName: 'Villarrica',
  },
}))

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza cabecera principal', () => {
    renderLogin()
    expect(screen.getByText('Vulcania', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getAllByText(/Alerta Verde/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/demostración local/i)).toBeInTheDocument()
  })

  it('renderiza input de teléfono y botones', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('+56 9 1234 5678')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Entrar al monitor demo/i })).toBeInTheDocument()
    expect(screen.getByText(/El 9 se agrega automáticamente después de \+56/)).toBeInTheDocument()
  })

  it('mantiene atributos de accesibilidad del input', () => {
    renderLogin()
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    expect(phoneInput).toHaveAttribute('required')
    expect(phoneInput).toHaveAttribute('autoComplete', 'tel')
  })

  it('permite escribir y formatear teléfono', async () => {
    const user = userEvent.setup()
    renderLogin()

    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    await user.type(phoneInput, '12345678')

    expect(String((phoneInput as HTMLInputElement).value)).toContain('+56 9')
  })

  it('envía el teléfono al iniciar sesión', async () => {
    mockLogin.mockResolvedValue(true)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('+56 9 1234 5678'), '12345678')
    await user.click(screen.getByRole('button', { name: /Entrar al monitor demo/i }))

    expect(mockLogin).toHaveBeenCalledWith(expect.stringContaining('+56 9'))
  })
})
