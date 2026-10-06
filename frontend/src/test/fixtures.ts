import type { Patient } from '../types'

export function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 1,
    first_name: 'Maria',
    last_name: 'Rodriguez',
    date_of_birth: '1980-04-12',
    age: 46,
    email: 'maria@example.com',
    phone: '(503) 555-0100',
    address: '1 Main Street',
    blood_type: 'A+',
    status: 'active',
    allergies: ['Penicillin'],
    conditions: ['Asthma'],
    last_visit: '2026-09-01',
    ...overrides,
  }
}
