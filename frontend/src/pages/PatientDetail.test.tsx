import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api'
import { toDateTimeInputValue } from '../format'
import { makePatient } from '../test/fixtures'
import { renderApp } from '../test/render'

const note = { id: 5, timestamp: '2026-09-01T15:30:00Z', content: 'Follow-up: symptoms improving.' }

beforeEach(() => {
  vi.spyOn(api, 'getPatient').mockResolvedValue(makePatient())
  vi.spyOn(api, 'listNotes').mockResolvedValue([note])
  vi.spyOn(api, 'getSummary').mockResolvedValue({ summary: 'Maria Rodriguez is a 46-year-old...' })
})

describe('PatientDetail', () => {
  it('shows the profile, summary, and notes', async () => {
    renderApp('/patients/1')
    expect(await screen.findByRole('heading', { name: 'Maria Rodriguez' })).toBeInTheDocument()
    expect(screen.getByText('4/12/1980 (age 46)')).toBeInTheDocument()
    expect(screen.getByText('Penicillin')).toBeInTheDocument()
    expect(await screen.findByText('Maria Rodriguez is a 46-year-old...')).toBeInTheDocument()
    expect(await screen.findByText(note.content)).toBeInTheDocument()
    // Shown in the viewer's time zone, so check the format rather than the hour.
    expect(screen.getByText(/^9\/1\/2026, \d{1,2}:\d{2} [AP]M$/)).toBeInTheDocument()
  })

  it('adds a note and refreshes the notes and summary', async () => {
    const createNote = vi.spyOn(api, 'createNote').mockResolvedValue(note)
    const user = userEvent.setup()
    renderApp('/patients/1')
    const addButton = await screen.findByRole('button', { name: 'Add note' })
    expect(addButton).toBeDisabled()

    await user.type(screen.getByLabelText('New note'), '  BP 120/80.  ')
    await user.click(addButton)

    // Left at its default, the time is set by the server when the note arrives.
    expect(createNote).toHaveBeenCalledWith(1, 'BP 120/80.', undefined)
    await waitFor(() => expect(api.listNotes).toHaveBeenCalledTimes(2))
    expect(api.getSummary).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('New note')).toHaveValue('')
  })

  it('defaults the note time to now and allows backdating it', async () => {
    const createNote = vi.spyOn(api, 'createNote').mockResolvedValue(note)
    const user = userEvent.setup()
    renderApp('/patients/1')
    const time = await screen.findByLabelText<HTMLInputElement>('Time')
    // The minute may have turned over since the page rendered.
    const recentMinutes = [0, 60_000].map((ms) => toDateTimeInputValue(new Date(Date.now() - ms)))
    expect(recentMinutes).toContain(time.value)

    fireEvent.change(time, { target: { value: '2026-09-01T08:30' } })
    await user.type(screen.getByLabelText('New note'), 'Phone follow-up.')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    // Local time in the viewer's time zone, sent as an absolute UTC time.
    expect(createNote).toHaveBeenCalledWith(
      1,
      'Phone follow-up.',
      new Date('2026-09-01T08:30').toISOString(),
    )
  })

  it('deletes a note only after confirmation', async () => {
    const deleteNote = vi.spyOn(api, 'deleteNote').mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    renderApp('/patients/1')
    const deleteButton = await screen.findByRole('button', { name: 'Delete note' })
    await user.click(deleteButton)
    expect(deleteNote).not.toHaveBeenCalled()
    await user.click(deleteButton)
    expect(deleteNote).toHaveBeenCalledWith(1, 5)
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
    expect(confirm).toHaveBeenLastCalledWith('Delete Maria Rodriguez and all of their notes?')
    expect(await screen.findByRole('heading', { name: 'Patients' })).toBeInTheDocument()
    expect(deletePatient).toHaveBeenCalledWith(1)
  })
})
