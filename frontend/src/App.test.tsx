import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './test/render'

describe('App', () => {
  it('renders the app title', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Healthcare Dashboard' })).toBeInTheDocument()
  })
})
