import { useLocation } from 'react-router-dom'

/** Navigation state that pages opened from the patient list carry: the list's URL query. */
export interface ListReturnState {
  listSearch: string
}

/** The state for links that open a page from the patient list at the given URL query. */
export const listReturnState = (listSearch: string): ListReturnState => ({ listSearch })

/**
 * Where "back to patients" leads: the list with the search, filter, sort, and page it was
 * opened from, or the plain list when the page was opened some other way. Pass `state` on to
 * further pages (such as edit) so they can return there too.
 */
export function useListReturn() {
  const state = useLocation().state as Partial<ListReturnState> | null
  const listSearch = state?.listSearch ?? ''
  return { listUrl: `/patients${listSearch}`, state: listReturnState(listSearch) }
}
