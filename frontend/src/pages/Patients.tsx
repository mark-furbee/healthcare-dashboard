import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useLocation, useSearchParams } from 'react-router-dom'
import { ErrorAlert } from '../components/ErrorAlert'
import { PatientList } from '../components/PatientList'
import { capitalize } from '../format'
import { patientsQuery } from '../queries'
import { SORT_FIELDS, STATUSES, type SortField } from '../types'
import { listReturnState } from '../useListReturn'

const PAGE_SIZE = 10
const SEARCH_DELAY_MS = 300

const oneOf = <T extends string>(options: readonly T[], value: string | null) =>
  options.find((option) => option === value)

/**
 * The /patients route: fetches the list for the search, filter, sort, and page in the URL
 * (for example ?search=chen&status=active&page=2), so Back, links, and reloads all return to
 * the same results. Defaults are left out of the URL.
 */
export function Patients() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const search = params.get('search') ?? ''
  const status = oneOf(STATUSES, params.get('status')) ?? ''
  const sort = oneOf(SORT_FIELDS, params.get('sort')) ?? 'name'
  const order = params.get('order') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(Number.parseInt(params.get('page') ?? '', 10) || 1, 1) - 1

  // Replacing the history entry keeps Back meaning "leave the list", not "undo a keystroke".
  function updateParams(changes: Record<string, string | null>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }

  // The input updates on every keystroke; the URL, and so the query, once typing pauses.
  const [searchInput, setSearchInput] = useState(search)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const writtenSearch = useRef(search)
  useEffect(() => () => clearTimeout(searchTimer.current), [])
  // A search this page didn't write came from navigation (such as the sidebar's Patients
  // link), so the input follows it and any pending search is dropped.
  useEffect(() => {
    if (search === writtenSearch.current) return
    writtenSearch.current = search
    clearTimeout(searchTimer.current)
    setSearchInput(search)
  }, [search])

  const patients = useQuery(
    patientsQuery({ page: page + 1, page_size: PAGE_SIZE, search, status, sort, order }),
  )

  function sortBy(field: SortField) {
    const nextOrder = sort === field && order === 'asc' ? 'desc' : 'asc'
    updateParams({
      sort: field === 'name' ? null : field,
      order: nextOrder === 'asc' ? null : nextOrder,
      page: null,
    })
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Patients
        </Typography>
        <Button
          component={RouterLink}
          to="/patients/new"
          state={listReturnState(location.search)}
          variant="contained"
        >
          New patient
        </Button>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Search by name or email"
          value={searchInput}
          onChange={(event) => {
            const value = event.target.value
            setSearchInput(value)
            clearTimeout(searchTimer.current)
            searchTimer.current = setTimeout(() => {
              writtenSearch.current = value.trim()
              updateParams({ search: value.trim(), page: null })
            }, SEARCH_DELAY_MS)
          }}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => updateParams({ status: event.target.value, page: null })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {STATUSES.map((option) => (
            <MenuItem key={option} value={option}>
              {capitalize(option)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {patients.isError && <ErrorAlert error={patients.error} onRetry={() => patients.refetch()} />}
      <PatientList
        patients={patients.data?.items}
        total={patients.data?.total ?? 0}
        loading={patients.isFetching}
        sort={sort}
        order={order}
        onSort={sortBy}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={(newPage) => updateParams({ page: newPage ? String(newPage + 1) : null })}
      />
    </Stack>
  )
}
