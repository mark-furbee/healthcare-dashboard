import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api'
import { makePatient } from '../test/fixtures'
import { renderApp } from '../test/render'

beforeEach(() => {
  vi.spyOn(api, 'getPatient').mockResolvedValue(makePatient())
})

describe('PatientDetail', () => {
  it('shows the profile', async () => {
    renderApp('/patients/1')
    expect(await screen.findByRole('heading', { name: 'Maria Rodriguez' })).toBeInTheDocument()
    expect(screen.getByText('4/12/1980 (age 46)')).toBeInTheDocument()
    expect(screen.getByText('Penicillin')).toBeInTheDocument()
  })

  it('renders the 404 page for an invalid id without calling the API', () => {
    renderApp('/patients/abc')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(api.getPatient).not.toHaveBeenCalled()
  })

  it('shows API errors such as an unknown patient', async () => {
    vi.mocked(api.getPatient).mockRejectedValue(new ApiError('Patient not found'))
    renderApp('/patients/999')
    expect(await screen.findByText('Patient not found')).toBeInTheDocument()
  })

  it('deletes the patient only after confirmation, then returns to the list', async () => {
    const deletePatient = vi.spyOn(api, 'deletePatient').mockResolvedValue()
    vi.spyOn(api, 'listPatients').mockResolvedValue({ items: [], total: 0 })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    renderApp('/patients/1')

    const deleteButton = await screen.findByRole('button', { name: 'Delete' })
    await user.click(deleteButton)
    expect(deletePatient).not.toHaveBeenCalled()

    await user.click(deleteButton)
    expect(confirm).toHaveBeenLastCalledWith('Delete Maria Rodriguez?')
    expect(await screen.findByRole('heading', { name: 'Patients' })).toBeInTheDocument()
    expect(deletePatient).toHaveBeenCalledWith(1)
  })
})
