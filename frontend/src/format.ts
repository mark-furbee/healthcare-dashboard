import type { Patient } from './types'

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const fullName = (patient: Patient) => `${patient.first_name} ${patient.last_name}`

/** Formats an ISO date (YYYY-MM-DD) as m/d/YYYY. Parsed by hand: new Date() would read it as UTC
 * midnight and show the previous day in time zones west of UTC. */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${month}/${day}/${year}`
}

/** Formats an ISO timestamp in the viewer's time zone as m/d/YYYY, h:mm AM/PM. */
export const formatDateTime = (isoTimestamp: string) =>
  new Date(isoTimestamp).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/** A Date as a datetime-local input's value (YYYY-MM-DDTHH:mm) in the viewer's time zone. */
export function toDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
