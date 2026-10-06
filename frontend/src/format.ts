import type { Patient } from './types'

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const fullName = (patient: Patient) => `${patient.first_name} ${patient.last_name}`

/** Formats an ISO date (YYYY-MM-DD) as m/d/YYYY. Parsed by hand: new Date() would read it as UTC
 * midnight and show the previous day in time zones west of UTC. */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${month}/${day}/${year}`
}
