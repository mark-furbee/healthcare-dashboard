import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from './api'
import type { PatientQuery } from './types'

// Patient query keys start with 'patients' (lists) or 'patient' (one record and its notes and
// summary), so a mutation can invalidate exactly the data it affects by prefix.
export const patientsQuery = (query: PatientQuery) =>
  queryOptions({
    queryKey: ['patients', query],
    queryFn: () => api.listPatients(query),
    // Keep showing the current page while the next one loads, instead of flashing a spinner.
    placeholderData: keepPreviousData,
  })

export const patientQuery = (id: number) =>
  queryOptions({ queryKey: ['patient', id], queryFn: () => api.getPatient(id) })

export const notesQuery = (patientId: number) =>
  queryOptions({
    queryKey: ['patient', patientId, 'notes'],
    queryFn: () => api.listNotes(patientId),
  })

export const summaryQuery = (patientId: number) =>
  queryOptions({
    queryKey: ['patient', patientId, 'summary'],
    queryFn: () => api.getSummary(patientId),
  })

// Choices for the patient form. Saving a patient can add a name, so saves invalidate these.
export const allergiesQuery = queryOptions({
  queryKey: ['allergies'],
  queryFn: () => api.listAllergies(),
})
export const conditionsQuery = queryOptions({
  queryKey: ['conditions'],
  queryFn: () => api.listConditions(),
})
