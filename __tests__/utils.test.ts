/**
 * Tests para la función cn (classNames utility)
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { cn } from '../lib/utils'

describe('cn() utility function', () => {
  it('should return empty string when no arguments', () => {
    expect(cn()).toBe('')
  })

  it('should merge simple class names', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('should filter out falsy values', () => {
    expect(cn('foo', null, undefined, false, 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes with objects', () => {
    expect(cn('base', { conditional: true })).toBe('base conditional')
    expect(cn('base', { conditional: false })).toBe('base')
  })

  it('should merge tailwind classes properly', () => {
    // tailwind-merge should handle conflicting classes
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle nested arrays', () => {
    expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz')
  })

  it('should handle complex combinations', () => {
    const result = cn(
      'base-class',
      { conditional: true, excluded: false },
      ['array-class'],
      null,
      undefined
    )
    expect(result).toBe('base-class conditional array-class')
  })
})
