import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from './api'
import type { PatientQuery } from './types'

// Every key comes from here, so a mutation invalidates exactly the data it affects by prefix:
// 'patients' covers every list, and ['patient', id] one record with its notes and summary.
export const queryKeys = {
  patients: ['patients'] as const,
  patient: (id: number) => ['patient', id] as const,
  allergies: ['allergies'] as const,
  conditions: ['conditions'] as const,
}

export const patientsQuery = (query: PatientQuery) =>
  queryOptions({
    queryKey: [...queryKeys.patients, query],
    queryFn: () => api.listPatients(query),
    // Keep showing the current page while the next one loads, instead of flashing a spinner.
    placeholderData: keepPreviousData,
  })

export const patientQuery = (id: number) =>
  queryOptions({ queryKey: queryKeys.patient(id), queryFn: () => api.getPatient(id) })

export const notesQuery = (patientId: number) =>
  queryOptions({
    queryKey: [...queryKeys.patient(patientId), 'notes'],
    queryFn: () => api.listNotes(patientId),
  })

export const summaryQuery = (patientId: number) =>
  queryOptions({
    queryKey: [...queryKeys.patient(patientId), 'summary'],
    queryFn: () => api.getSummary(patientId),
  })

// Choices for the patient form. Saving a patient can add a name, so saves invalidate these.
export const allergiesQuery = queryOptions({
  queryKey: queryKeys.allergies,
  queryFn: () => api.listAllergies(),
})
export const conditionsQuery = queryOptions({
  queryKey: queryKeys.conditions,
  queryFn: () => api.listConditions(),
})
