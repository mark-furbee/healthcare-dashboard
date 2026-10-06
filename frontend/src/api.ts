import type { Note, Patient, PatientInput, PatientPage, PatientQuery } from './types'

export class ApiError extends Error {
  /** Messages for request-body fields the API rejected, keyed by field name. */
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.fieldErrors = fieldErrors
  }
}

interface ValidationError {
  loc: (string | number)[]
  msg: string
}

function errorMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    // FastAPI validation errors: loc is e.g. ["body", "email"]; drop the "body"/"query" prefix.
    return detail
      .map((error: ValidationError) => `${error.loc.slice(1).join('.')}: ${error.msg}`)
      .join('. ')
  }
  return 'Something went wrong. Please try again.'
}

function fieldErrors(detail: unknown): Record<string, string> {
  if (!Array.isArray(detail)) return {}
  // Only errors on a whole body field, such as ["body", "email"], belong to a single form field.
  const fieldLevel = detail.filter(
    (error: ValidationError) => error.loc.length === 2 && error.loc[0] === 'body',
  )
  return Object.fromEntries(fieldLevel.map((error: ValidationError) => [error.loc[1], error.msg]))
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(errorMessage(body.detail), fieldErrors(body.detail))
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

function toSearchParams(query: PatientQuery) {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  return new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))
}

export const api = {
  listPatients: (query: PatientQuery) => request<PatientPage>(`/patients?${toSearchParams(query)}`),
  getPatient: (id: number) => request<Patient>(`/patients/${id}`),
  createPatient: (input: PatientInput) =>
    request<Patient>('/patients', { method: 'POST', body: JSON.stringify(input) }),
  updatePatient: (id: number, input: PatientInput) =>
    request<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deletePatient: (id: number) => request<void>(`/patients/${id}`, { method: 'DELETE' }),
  listNotes: (patientId: number) => request<Note[]>(`/patients/${patientId}/notes`),
  /** Without a timestamp, the note is stamped with the current time. */
  createNote: (patientId: number, content: string, timestamp?: string) =>
    request<Note>(`/patients/${patientId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, timestamp }),
    }),
  deleteNote: (patientId: number, noteId: number) =>
    request<void>(`/patients/${patientId}/notes/${noteId}`, { method: 'DELETE' }),
  // The summary dates notes in the viewer's time zone, like the notes list.
  getSummary: (patientId: number) =>
    request<{ summary: string }>(
      `/patients/${patientId}/summary?${new URLSearchParams({
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })}`,
    ),
  listAllergies: () => request<string[]>('/allergies'),
  listConditions: () => request<string[]>('/conditions'),
}
