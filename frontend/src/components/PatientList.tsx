import {
  LinearProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material'
import type { MouseEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import type { ListReturnState } from '../useListReturn'
import { formatDate, fullName } from '../format'
import type { Patient, SortField } from '../types'
import { StatusChip } from './StatusChip'

// detail names the gray second line in that column's cells.
const COLUMNS: { field: SortField; label: string; detail?: string }[] = [
  { field: 'name', label: 'Name', detail: 'email' },
  { field: 'age', label: 'Age', detail: 'DOB' },
  { field: 'last_visit', label: 'Last visit' },
  { field: 'status', label: 'Status' },
]

interface PatientListProps {
  /** The current page of patients; undefined until the first page loads. */
  patients?: Patient[]
  total: number
  loading: boolean
  sort: SortField
  order: 'asc' | 'desc'
  onSort: (field: SortField) => void
  /** Zero-based page index. */
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

/** A sortable, paginated table of patients. Fetching and query state belong to the caller. */
export function PatientList({
  patients,
  total,
  loading,
  sort,
  order,
  onSort,
  page,
  pageSize,
  onPageChange,
}: PatientListProps) {
  const navigate = useNavigate()
  // Opened patients remember this list's search, filter, sort, and page for their back link.
  const listState: ListReturnState = { listSearch: useLocation().search }

  // The whole row opens the patient for mouse users; the name stays a real link for keyboard
  // and screen-reader users. Clicks on the link itself, and clicks that finish selecting text
  // (to copy an email, say), are left alone.
  function openPatient(event: MouseEvent, id: number) {
    const clickedLink = (event.target as Element).closest('a')
    if (clickedLink || window.getSelection()?.toString()) return
    navigate(`/patients/${id}`, { state: listState })
  }

  return (
    <>
      <TableContainer>
        <LinearProgress sx={{ visibility: loading ? 'visible' : 'hidden' }} />
        <Table>
          <TableHead>
            <TableRow>
              {COLUMNS.map(({ field, label, detail }) => (
                <TableCell key={field}>
                  <TableSortLabel
                    active={sort === field}
                    direction={sort === field ? order : 'asc'}
                    onClick={() => onSort(field)}
                  >
                    {/* One inline span, so the space before the detail survives the label's
                        flex layout. */}
                    <span>
                      {label}
                      {detail && (
                        <>
                          {' '}
                          <Typography component="span" variant="inherit" color="text.secondary">
                            ({detail})
                          </Typography>
                        </>
                      )}
                    </span>
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {patients?.map((patient) => (
              <TableRow
                key={patient.id}
                hover
                onClick={(event) => openPatient(event, patient.id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Link component={RouterLink} to={`/patients/${patient.id}`} state={listState}>
                    {fullName(patient)}
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    {patient.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  {patient.age}
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(patient.date_of_birth)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {patient.last_visit ? formatDate(patient.last_visit) : 'None'}
                </TableCell>
                <TableCell>
                  <StatusChip status={patient.status} />
                </TableCell>
              </TableRow>
            ))}
            {patients?.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length}>No patients found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[]}
        onPageChange={(_, newPage) => onPageChange(newPage)}
      />
    </>
  )
}
