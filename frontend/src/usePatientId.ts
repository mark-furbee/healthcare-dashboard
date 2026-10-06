import { useParams } from 'react-router-dom'

/** The :id route parameter as a positive integer, or null when it is not a valid patient id. */
export function usePatientId(): number | null {
  const id = Number(useParams().id)
  return Number.isInteger(id) && id > 0 ? id : null
}
