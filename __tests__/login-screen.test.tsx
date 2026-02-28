/**
 * Tests para el componente LoginScreen de Vulcania
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginScreen from '../components/login-screen'

// Mock del contexto de auth
const mockLogin = vi.fn()
const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock de APP_CONFIG
vi.mock('@/lib/app-config', () => ({
  APP_CONFIG: {
    demoMode: true,
    demoPhone: '+56912345678',
    volcanoName: 'Volcán Vulcano',
  },
}))

describe('LoginScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      usuario: null,
      loading: false,
    })
  })

  it('should render login screen with title', () => {
    render(<LoginScreen />)
    
    expect(screen.getByText('VOLCANO EMERGENCIA')).toBeInTheDocument()
    expect(screen.getByText('Un guardián que vigila y guía')).toBeInTheDocument()
    expect(screen.getByText('Acceso con SMS')).toBeInTheDocument()
  })

  it('should render phone input with placeholder', () => {
    render(<LoginScreen />)
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    expect(phoneInput).toBeInTheDocument()
    expect(phoneInput).toHaveAttribute('type', 'tel')
  })

  it('should render send SMS button', () => {
    render(<LoginScreen />)
    
    expect(screen.getByText('Enviar código SMS')).toBeInTheDocument()
  })

  it('should render demo access button', () => {
    render(<LoginScreen />)
    
    expect(screen.getByText('🚀 Acceso Directo (Demo)')).toBeInTheDocument()
  })

  it('should format phone number as user types', async () => {
    render(<LoginScreen />)
    const user = userEvent.setup()
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    
    // Simular escritura de número
    await user.type(phoneInput, '12345678')
    
    // El número debería estar formateado
    expect(phoneInput).toHaveValue('+56 9 1234 5678')
  })

  it('should show error for invalid phone format', async () => {
    render(<LoginScreen />)
    const user = userEvent.setup()
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    const submitButton = screen.getByText('Enviar código SMS')
    
    // Limpiar el input y poner un número inválido
    await user.clear(phoneInput)
    await user.type(phoneInput, '+56 1234567') // Sin el 9
    
    await user.click(submitButton)
    
    // Debería mostrar error
    await waitFor(() => {
      expect(screen.getByText(/número móvil chileno/i)).toBeInTheDocument()
    })
  })

  it('should show error for short phone number', async () => {
    render(<LoginScreen />)
    const user = userEvent.setup()
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    const submitButton = screen.getByText('Enviar código SMS')
    
    await user.clear(phoneInput)
    await user.type(phoneInput, '+56 9 123') // Muy corto
    
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/número es muy corto/i)).toBeInTheDocument()
    })
  })

  it('should call login on form submit with valid phone', async () => {
    mockLogin.mockResolvedValue(true)
    
    render(<LoginScreen />)
    const user = userEvent.setup()
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    const submitButton = screen.getByText('Enviar código SMS')
    
    await user.type(phoneInput, '12345678')
    await user.click(submitButton)
    
    // Debería mostrar loading
    expect(screen.getByText('Enviando SMS...')).toBeInTheDocument()
    
    // Esperar que se complete el login
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('+56 9 1234 5678')
    })
  })

  it('should show error when login fails', async () => {
    mockLogin.mockResolvedValue(false)
    
    render(<LoginScreen />)
    const user = userEvent.setup()
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    const submitButton = screen.getByText('Enviar código SMS')
    
    await user.type(phoneInput, '12345678')
    await user.click(submitButton)
    
    // Esperar error
    await waitFor(() => {
      expect(screen.getByText(/Error al iniciar sesión/i)).toBeInTheDocument()
    })
  })

  it('should call login on demo access button click', async () => {
    mockLogin.mockResolvedValue(true)
    
    render(<LoginScreen />)
    const user = userEvent.setup()
    
    const demoButton = screen.getByText('🚀 Acceso Directo (Demo)')
    await user.click(demoButton)
    
    // Debería mostrar loading
    expect(screen.getByText('Accediendo...')).toBeInTheDocument()
    
    // Esperar que se complete el login
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('+56912345678')
    })
  })

  it('should disable buttons when loading', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})) // Nunca resuelve
    
    render(<LoginScreen />)
    const user = userEvent.setup()
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    const submitButton = screen.getByText('Enviar código SMS')
    
    await user.type(phoneInput, '12345678')
    await user.click(submitButton)
    
    // Ambos botones deberían estar deshabilitados
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('🚀 Acceso Directo (Demo)')).toBeDisabled()
  })

  it('should show demo info message', () => {
    render(<LoginScreen />)
    
    expect(screen.getByText(/Demo:/i)).toBeInTheDocument()
    expect(screen.getByText(/Usuario demo sugerido:/i)).toBeInTheDocument()
  })

  it('should render Mountain icon', () => {
    render(<LoginScreen />)
    
    // El icono debería estar presente (Lucide Mountain)
    const mountainIcon = document.querySelector('svg')
    expect(mountainIcon).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<LoginScreen />)
    
    const phoneInput = screen.getByPlaceholderText('+56 9 1234 5678')
    expect(phoneInput).toHaveAttribute('required')
    expect(phoneInput).toHaveAttribute('pattern')
    expect(phoneInput).toHaveAttribute('autoComplete', 'tel')
  })
})
