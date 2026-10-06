import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from './test/render'

describe('App', () => {
  it('renders the header, navigation, and a 404 page for unknown routes', () => {
    renderApp('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Healthcare Dashboard' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Patients' })).not.toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('switches theme and remembers the choice', async () => {
    const user = userEvent.setup()
    renderApp('/does-not-exist')
    await user.click(screen.getByRole('combobox', { name: 'Theme' }))
    await user.click(screen.getByRole('option', { name: 'Dark' }))
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('restores a saved theme', () => {
    localStorage.setItem('theme', 'dark')
    renderApp('/does-not-exist')
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
  })
})
