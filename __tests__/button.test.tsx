/**
 * Tests para componentes UI
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should apply variant classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })

  it('should apply size classes', () => {
    const { container } = render(<Button size="lg">Large</Button>)
    expect(container.firstChild).toHaveClass('h-11')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await import('@testing-library/user-event').then(({ default: userEvent }) => {
      userEvent.click(screen.getByText('Click'))
    })
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    )
    expect(screen.getByText('Link')).toHaveAttribute('href', '/test')
  })
})
