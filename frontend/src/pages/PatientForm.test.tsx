import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api'
import { makePatient, makeSummary } from '../test/fixtures'
import { renderApp } from '../test/render'

const maria = makePatient()

beforeEach(() => {
  // After saving, the form navigates to the patient's detail page.
  vi.spyOn(api, 'getPatient').mockResolvedValue(maria)
  vi.spyOn(api, 'listNotes').mockResolvedValue([])
  vi.spyOn(api, 'getSummary').mockResolvedValue(makeSummary())
  vi.spyOn(api, 'listAllergies').mockResolvedValue(['Latex', 'Penicillin', 'Pollen'])
  vi.spyOn(api, 'listConditions').mockResolvedValue(['Asthma', 'Migraine'])
})

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), ' Avery ')
  await user.type(screen.getByLabelText('Last name'), 'Kim')
  fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '1990-05-01' } })
  await user.type(screen.getByLabelText('Email'), 'avery@example.com')
  await user.type(screen.getByLabelText('Phone'), '(503) 555-0199')
  await user.type(screen.getByLabelText('Address'), '9 Oak Road')
  await user.click(screen.getByRole('combobox', { name: 'Blood type' }))
  await user.click(screen.getByRole('option', { name: 'AB+' }))
}

describe('PatientForm', () => {
  it('shows validation errors without submitting', async () => {
    const createPatient = vi.spyOn(api, 'createPatient')
    const user = userEvent.setup()
    renderApp('/patients/new')
    fireEvent.change(screen.getByLabelText('Last visit'), { target: { value: '2999-01-01' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    for (const message of [
      'First name is required',
      'Date of birth is required',
      'Enter a valid email address',
      'Select a blood type',
      'Last visit cannot be in the future',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument()
    }
    expect(createPatient).not.toHaveBeenCalled()
  })

  it('creates a patient and opens their record', async () => {
    const createPatient = vi.spyOn(api, 'createPatient').mockResolvedValue(maria)
    const user = userEvent.setup()
    renderApp('/patients/new')
    await fillRequiredFields(user)
    // Pick a listed allergy, type a listed one in other capitalization, then add a new one.
    const allergies = screen.getByRole('combobox', { name: 'Allergies' })
    await user.click(allergies)
    await user.click(await screen.findByRole('option', { name: 'Latex' }))
    await user.type(allergies, 'pollen{Enter}Shellfish{Enter}')
    // A name typed without Enter is kept when the field loses focus.
    await user.type(screen.getByRole('combobox', { name: 'Conditions' }), 'Gout')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(createPatient).toHaveBeenCalledWith({
      first_name: 'Avery',
      last_name: 'Kim',
      date_of_birth: '1990-05-01',
      email: 'avery@example.com',
      phone: '(503) 555-0199',
      address: '9 Oak Road',
      blood_type: 'AB+',
      status: 'active',
      allergies: ['Latex', 'Pollen', 'Shellfish'],
      conditions: ['Gout'],
      last_visit: null,
    })
    expect(await screen.findByRole('heading', { name: 'Maria Rodriguez' })).toBeInTheDocument()
  })

  it('shows API field errors, such as a duplicate email, on the field', async () => {
    const message = 'A patient with this email already exists'
    vi.spyOn(api, 'createPatient').mockRejectedValue(
      new ApiError(`email: ${message}`, { email: message }),
    )
    const user = userEvent.setup()
    renderApp('/patients/new')
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(message)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains length limits on the fields', async () => {
    const createPatient = vi.spyOn(api, 'createPatient')
    const user = userEvent.setup()
    renderApp('/patients/new')
    await fillRequiredFields(user)
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'x'.repeat(81) } })
    const allergies = screen.getByRole('combobox', { name: 'Allergies' })
    fireEvent.change(allergies, { target: { value: 'x'.repeat(101) } })
    fireEvent.keyDown(allergies, { key: 'Enter' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('First name must be 80 characters or fewer')).toBeInTheDocument()
    expect(screen.getByText('Each allergy must be 100 characters or fewer')).toBeInTheDocument()
    expect(createPatient).not.toHaveBeenCalled()
  })

  it('shows an API error on one allergy on the Allergies field', async () => {
    const message = 'String should have at most 100 characters'
    vi.spyOn(api, 'createPatient').mockRejectedValue(
      new ApiError(`allergies.0: ${message}`, { allergies: message }),
    )
    const user = userEvent.setup()
    renderApp('/patients/new')
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows other API errors below the form', async () => {
    vi.spyOn(api, 'createPatient').mockRejectedValue(new ApiError('Unable to reach the server.'))
    const user = userEvent.setup()
    renderApp('/patients/new')
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server.')
  })

  it('edits an existing patient', async () => {
    const updatePatient = vi.spyOn(api, 'updatePatient').mockResolvedValue(maria)
    const user = userEvent.setup()
    renderApp('/patients/1/edit')
    expect(await screen.findByLabelText('First name')).toHaveValue('Maria')
    expect(screen.getByText('Penicillin')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Allergies' }))
    const penicillin = await screen.findByRole('option', { name: 'Penicillin' })
    expect(within(penicillin).getByRole('checkbox')).toBeChecked()
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(updatePatient).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ first_name: 'Maria', allergies: ['Penicillin'] }),
      ),
    )
  })

  it('explains when the allergy and condition choices fail to load', async () => {
    vi.mocked(api.listAllergies).mockRejectedValue(new ApiError('Not Found'))
    renderApp('/patients/new')
    expect(
      await screen.findByText("Couldn't load the list of choices; you can still type names."),
    ).toBeInTheDocument()
  })

  it('renders the 404 page for an invalid id', () => {
    renderApp('/patients/abc/edit')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
