import { describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'
import type { PatientInput } from './types'

function stubFetch(result: Response | Error) {
  const fetch = vi.fn(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('api', () => {
  it('sends list queries without empty parameters', async () => {
    const fetch = stubFetch(jsonResponse({ items: [], total: 0 }))
    await expect(api.listPatients({ page: 2, search: '', status: 'active' })).resolves.toEqual({
      items: [],
      total: 0,
    })
    expect(fetch).toHaveBeenCalledWith('/api/patients?page=2&status=active', expect.anything())
  })

  it('explains network failures', async () => {
    stubFetch(new TypeError('Failed to fetch'))
    await expect(api.listPatients({})).rejects.toThrow(/unable to reach the server/i)
  })

  it('uses the detail message from API errors', async () => {
    stubFetch(jsonResponse({ detail: 'Patient not found' }, 404))
    await expect(api.listPatients({})).rejects.toThrow(new ApiError('Patient not found'))
  })

  it('names the field for each validation error', async () => {
    const detail = [
      { loc: ['body', 'email'], msg: 'Enter a valid email address' },
      { loc: ['body', 'conditions', 0], msg: 'String should have at least 1 character' },
    ]
    stubFetch(jsonResponse({ detail }, 422))
    await expect(api.listPatients({})).rejects.toThrow(
      'email: Enter a valid email address. conditions.0: String should have at least 1 character',
    )
  })

  it('keeps whole-field validation errors by field name', async () => {
    const detail = [
      { loc: ['body', 'email'], msg: 'A patient with this email already exists' },
      { loc: ['body', 'conditions', 0], msg: 'String should have at least 1 character' },
    ]
    stubFetch(jsonResponse({ detail }, 422))
    const error = await api.createPatient({} as PatientInput).catch((error) => error)
    expect(error.fieldErrors).toEqual({ email: 'A patient with this email already exists' })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    stubFetch(new Response('Bad gateway', { status: 502 }))
    await expect(api.listPatients({})).rejects.toThrow(/something went wrong/i)
  })
})
