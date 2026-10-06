import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { makePatient } from '../test/fixtures'
import { renderApp } from '../test/render'

describe('Dashboard', () => {
  it('shows patient counts and the most recent visits', async () => {
    const listPatients = vi
      .spyOn(api, 'listPatients')
      .mockImplementation(async ({ status }) =>
        status === 'active' ? { items: [], total: 15 } : { items: [makePatient()], total: 20 },
      )
    renderApp('/')

    expect(await screen.findByText('20')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Maria Rodriguez/ })).toHaveAttribute(
      'href',
      '/patients/1',
    )
    expect(screen.getByText('Last visit: 9/1/2026')).toBeInTheDocument()
    expect(listPatients).toHaveBeenCalledWith({ page_size: 5, sort: 'last_visit', order: 'desc' })
  })
})
