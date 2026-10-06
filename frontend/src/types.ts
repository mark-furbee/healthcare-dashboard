export const STATUSES = ['active', 'inactive', 'discharged'] as const
export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export type Status = (typeof STATUSES)[number]
export type BloodType = (typeof BLOOD_TYPES)[number]
export const SORT_FIELDS = ['name', 'age', 'last_visit', 'status'] as const
export type SortField = (typeof SORT_FIELDS)[number]

export interface PatientInput {
  first_name: string
  last_name: string
  date_of_birth: string
  email: string
  phone: string
  address: string
  blood_type: BloodType
  status: Status
  allergies: string[]
  conditions: string[]
  last_visit: string | null
}

export interface Patient extends PatientInput {
  id: number
  age: number
}

export interface PatientPage {
  items: Patient[]
  total: number
}

export interface PatientQuery {
  page?: number
  page_size?: number
  search?: string
  status?: Status | ''
  sort?: SortField
  order?: 'asc' | 'desc'
}

export interface Note {
  id: number
  timestamp: string
  content: string
}

/** The generated summary as text, and its parts for laying it out. */
export interface Summary {
  summary: string
  overview: string
  conditions: string[]
  allergies: string[]
  /** Note excerpts, oldest first, dated m/d/YYYY in the viewer's time zone. */
  history: { date: string; excerpt: string }[]
}
