# 🧪 Guía de Testing - Vulcania Web

Este documento describe cómo ejecutar y escribir tests para la aplicación Vulcania.

## 📦 Instalación

```bash
# Instalar dependencias de testing
pnpm install

# Las siguientes dependencias fueron agregadas:
# - vitest (framework de tests)
# - @testing-library/react (tests de componentes)
# - @testing-library/jest-dom (matchers de DOM)
# - @testing-library/user-event (simulación de interacciones)
# - jsdom (entorno de tests)
# - @vitest/coverage-v8 (cobertura de código)
# - @vitest/ui (UI de tests)
```

## 🚀 Comandos Disponibles

```bash
# Ejecutar tests en modo watch (desarrollo)
pnpm test

# Ejecutar tests una vez (CI/CD)
pnpm test:run

# Ejecutar tests con reporte de cobertura
pnpm test:coverage

# Abrir UI de tests (visual)
pnpm test:ui
```

## 📁 Estructura de Tests

```
vulcania-web/
├── __tests__/
│   ├── setup.ts              # Configuración global
│   ├── utils.test.ts         # Tests para lib/utils.ts
│   ├── app-config.test.ts    # Tests para configuración
│   ├── auth-utils.test.ts    # Tests para auth helpers
│   ├── button.test.tsx       # Tests para componentes UI
│   └── *.test.ts(x)          # Nuevos tests
├── vitest.config.ts          # Configuración de Vitest
└── package.json
```

## ✍️ Escribiendo Tests

### Test Unitario (Utilidades)

```typescript
// __tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn() utility', () => {
  it('should merge tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
```

### Test de Componente

```typescript
// __tests__/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click</Button>)
    expect(screen.getByText('Click')).toBeInTheDocument()
  })
})
```

### Test de Integración (Auth)

```typescript
// __tests__/auth.test.tsx
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/contexts/auth-context'

describe('useAuth', () => {
  it('should login with valid phone', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      const success = await result.current.login('+56912345678')
      expect(success).toBe(true)
    })
  })
})
```

## 🎯 Mejores Prácticas

1. **Nombres descriptivos**: `it('should return false for invalid phone')`
2. **AAA Pattern**: Arrange, Act, Assert
3. **Tests aislados**: Cada test debe ser independiente
4. **Mocks explícitos**: Mockear solo lo necesario
5. **Cobertura útil**: Enfocarse en lógica crítica, no 100% ciego

## 🔧 Configuración

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
  },
})
```

### setup.ts

Configura mocks globales:
- Next.js router
- Supabase client
- Auth context
- Console warnings

## 📊 Cobertura de Código

El reporte de cobertura se genera en:
- `coverage/index.html` (reporte HTML interactivo)
- `coverage/coverage-final.json` (datos JSON)

**Archivos excluidos:**
- `node_modules/`
- `__tests__/`
- `scripts/`
- `**/*.d.ts`
- `**/*.config.*`

## 🐛 Troubleshooting

### "Cannot find module"

Verifica que el alias `@` esté configurado en `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}
```

### "window is not defined"

Asegúrate de tener `environment: 'jsdom'` en la configuración.

### Tests fallan en CI

Ejecuta localmente con `pnpm test:run` (mismo modo que CI).

## 📚 Recursos

- [Vitest Docs](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [React Testing Examples](https://kentcdodds.com/blog/common-mistakes-with-react-testing)

---

*Última actualización: 2026-02-28*
