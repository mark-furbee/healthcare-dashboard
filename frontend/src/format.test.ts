import { describe, expect, it } from 'vitest'
import { formatDate } from './format'

describe('formatDate', () => {
  it('formats ISO dates as m/d/YYYY without leading zeros', () => {
    expect(formatDate('1980-04-12')).toBe('4/12/1980')
    expect(formatDate('2026-12-01')).toBe('12/1/2026')
  })
})
