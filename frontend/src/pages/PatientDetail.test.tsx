import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api'
import { toDateTimeInputValue } from '../format'
import { makePatient, makeSummary } from '../test/fixtures'
import { renderApp } from '../test/render'

const note = { id: 5, timestamp: '2026-09-01T15:30:00Z', content: 'Follow-up: symptoms improving.' }

beforeEach(() => {
  vi.spyOn(api, 'getPatient').mockResolvedValue(makePatient())
  vi.spyOn(api, 'listNotes').mockResolvedValue([note])
  vi.spyOn(api, 'getSummary').mockResolvedValue(
    makeSummary({
      overview: 'Maria Rodriguez is a 46-year-old active patient with blood type A+.',
      conditions: ['Asthma'],
      allergies: ['Penicillin'],
      history: [{ date: '9/1/2026', excerpt: 'Follow-up: symptoms improving.' }],
    }),
  )
})

describe('PatientDetail', () => {
  it('shows the profile, summary, and notes', async () => {
    renderApp('/patients/1')
    expect(await screen.findByRole('heading', { name: 'Maria Rodriguez' })).toBeInTheDocument()
    expect(screen.getByText('4/12/1980 (age 46)')).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Maria Rodriguez is a 46-year-old active patient with blood type A+.',
      ),
    ).toBeInTheDocument()
    // The summary labels its grouped values.
    const summary = screen.getByRole('heading', { name: 'Summary' }).parentElement!
    const valueOf = (label: string) =>
      within(summary).getByText(label).nextElementSibling as HTMLElement
    expect(within(valueOf('Conditions')).getByText('Asthma')).toBeInTheDocument()
    expect(within(valueOf('Allergies')).getByText('Penicillin')).toBeInTheDocument()
    expect(within(valueOf('History')).getByText('9/1/2026')).toBeInTheDocument()
    // The note appears in the summary's history and in the notes list.
    expect(await screen.findAllByText(note.content)).toHaveLength(2)
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

  it('counts characters near the note limit and blocks notes over it', async () => {
    renderApp('/patients/1')
    const field = await screen.findByLabelText('New note')
    const addButton = screen.getByRole('button', { name: 'Add note' })

    fireEvent.change(field, { target: { value: 'x'.repeat(4500) } })
    expect(screen.getByText('4,500 / 5,000')).toBeInTheDocument()
    expect(addButton).toBeEnabled()

    // Pasted text isn't cut off; the note just can't be added until it fits.
    fireEvent.change(field, { target: { value: 'x'.repeat(5001) } })
    expect(field).toHaveValue('x'.repeat(5001))
    expect(
      screen.getByText('Notes must be 5,000 characters or fewer (currently 5,001)'),
    ).toBeInTheDocument()
    expect(addButton).toBeDisabled()
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
