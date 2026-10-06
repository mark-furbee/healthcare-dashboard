import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { makePatient } from '../test/fixtures'
import { PatientList } from './PatientList'

const maria = makePatient()
const daniel = makePatient({
  id: 2,
  first_name: 'Daniel',
  last_name: 'Chen',
  age: 34,
  status: 'inactive',
  last_visit: null,
})

function PatientPage() {
  return <p>Patient {useParams().id}</p>
}

function renderList(props: Partial<ComponentProps<typeof PatientList>> = {}) {
  const defaults = {
    patients: [maria, daniel],
    total: 2,
    loading: false,
    sort: 'name' as const,
    order: 'asc' as const,
    onSort: vi.fn(),
    page: 0,
    pageSize: 10,
    onPageChange: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<PatientList {...merged} />} />
        <Route path="/patients/:id" element={<PatientPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return merged
}

describe('PatientList', () => {
  it('shows name, email, age, date of birth, last visit, and status for each patient', () => {
    renderList()
    const mariaRow = screen.getByRole('link', { name: 'Maria Rodriguez' }).closest('tr')!
    expect(within(mariaRow).getByText('maria@example.com')).toBeInTheDocument()
    expect(within(mariaRow).getByText('4/12/1980')).toBeInTheDocument()
    expect(within(mariaRow).getByText('9/1/2026')).toBeInTheDocument()
    const row = screen.getByRole('link', { name: 'Daniel Chen' }).closest('tr')!
    expect(row).toHaveTextContent('34')
    expect(row).toHaveTextContent('None')
    expect(within(row).getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Maria Rodriguez' })).toHaveAttribute(
      'href',
      '/patients/1',
    )
  })

  it('names the gray detail line in the column headers', () => {
    renderList()
    expect(screen.getByRole('button', { name: 'Name (email)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Age (DOB)' })).toBeInTheDocument()
  })

  it('opens the patient when any part of the row is clicked', async () => {
    const user = userEvent.setup()
    renderList()
    await user.click(screen.getByText('Inactive'))
    expect(screen.getByText('Patient 2')).toBeInTheDocument()
  })

  it('shows an empty state', () => {
    renderList({ patients: [], total: 0 })
    expect(screen.getByText('No patients found.')).toBeInTheDocument()
  })

  it('reports sort and page changes to the caller', async () => {
    const user = userEvent.setup()
    const { onSort, onPageChange } = renderList({ total: 25 })
    await user.click(screen.getByRole('button', { name: 'Age (DOB)' }))
    expect(onSort).toHaveBeenCalledWith('age')
    await user.click(screen.getByRole('button', { name: 'Go to next page' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
