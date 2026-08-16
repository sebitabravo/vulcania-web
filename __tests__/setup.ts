/**
 * Setup file for Vitest tests
 * Configures global mocks and test utilities
 */

import '@testing-library/jest-dom'

vi.stubEnv('NODE_ENV', 'test')

// Mock for Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock for Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
  Usuario: {},
  AlertaVolcan: {},
  ParametrosVolcan: {},
}))

// Suppress console warnings during tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes('Supabase no configurado')) return
  originalWarn(...args)
}
