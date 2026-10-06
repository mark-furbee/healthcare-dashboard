import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { api, ApiError } from '../api'
import { makePatient, makeSummary } from '../test/fixtures'
import { renderApp } from '../test/render'

let listPatients: MockInstance<typeof api.listPatients>
const lastQuery = () => listPatients.mock.lastCall?.[0]

beforeEach(() => {
  listPatients = vi
    .spyOn(api, 'listPatients')
    .mockResolvedValue({ items: [makePatient()], total: 1 })
})

describe('Patients page', () => {
  it('waits for typing to pause before searching', async () => {
    const user = userEvent.setup()
    renderApp('/patients')
    await screen.findByText('Maria Rodriguez')
    await user.type(screen.getByLabelText('Search by name or email'), 'chen')
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'chen', page: 1 }))
    const searches = listPatients.mock.calls.map(([query]) => query.search)
    expect(new Set(searches)).toEqual(new Set(['', 'chen']))
  })

  it('filters by status', async () => {
    const user = userEvent.setup()
    renderApp('/patients')
    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(screen.getByRole('option', { name: 'Discharged' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ status: 'discharged', page: 1 }))
  })

  it('toggles sort direction when a column header is clicked twice', async () => {
    const user = userEvent.setup()
    renderApp('/patients')
    await user.click(screen.getByRole('button', { name: 'Age (DOB)' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'age', order: 'asc' }))
    await user.click(screen.getByRole('button', { name: 'Age (DOB)' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ sort: 'age', order: 'desc' }))
  })

  it('requests the next page', async () => {
    listPatients.mockResolvedValue({ items: [makePatient()], total: 25 })
    const user = userEvent.setup()
    renderApp('/patients')
    await user.click(await screen.findByRole('button', { name: 'Go to next page' }))
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2, page_size: 10 }))
  })

  it('shows errors with a retry action', async () => {
    listPatients.mockRejectedValueOnce(new ApiError('Unable to reach the server.'))
    const user = userEvent.setup()
    renderApp('/patients')
    await user.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Maria Rodriguez')).toBeInTheDocument()
  })

  it('restores search, filter, sort, and page from the URL', async () => {
    renderApp('/patients?search=chen&status=active&sort=age&order=desc&page=2')
    expect(screen.getByLabelText('Search by name or email')).toHaveValue('chen')
    await waitFor(() =>
      expect(lastQuery()).toEqual({
        search: 'chen',
        status: 'active',
        sort: 'age',
        order: 'desc',
        page: 2,
        page_size: 10,
      }),
    )
  })

  it('ignores invalid values in the URL', async () => {
    renderApp('/patients?status=unknown&sort=email&order=up&page=-3')
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ status: '', sort: 'name', order: 'asc', page: 1 }),
    )
  })

  it('returns to the same results from a patient', async () => {
    vi.spyOn(api, 'getPatient').mockResolvedValue(makePatient())
    vi.spyOn(api, 'listNotes').mockResolvedValue([])
    vi.spyOn(api, 'getSummary').mockResolvedValue(makeSummary())
    const user = userEvent.setup()
    renderApp('/patients?search=maria&status=active')
    await user.click(await screen.findByText('maria@example.com'))
    await user.click(await screen.findByRole('link', { name: '← Back to patients' }))

    expect(screen.getByLabelText('Search by name or email')).toHaveValue('maria')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Active')
    expect(lastQuery()).toMatchObject({ search: 'maria', status: 'active' })
  })

  it('starts a fresh list from the Patients navigation link', async () => {
    const user = userEvent.setup()
    renderApp('/patients?search=maria')
    await user.click(screen.getAllByRole('link', { name: 'Patients' })[0])
    expect(screen.getByLabelText('Search by name or email')).toHaveValue('')
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: '' }))
  })
})
