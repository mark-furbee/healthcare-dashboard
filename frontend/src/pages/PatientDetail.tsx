import { Button, CircularProgress, Link, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Detail, DetailList } from '../components/DetailList'
import { ErrorAlert } from '../components/ErrorAlert'
import { PatientNotes } from '../components/PatientNotes'
import { PatientSummary } from '../components/PatientSummary'
import { Section } from '../components/Section'
import { StatusChip } from '../components/StatusChip'
import { formatDate, formatDateOrNone, fullName } from '../format'
import { patientQuery, queryKeys } from '../queries'
import { useListReturn } from '../useListReturn'
import { usePatientId } from '../usePatientId'
import { NotFound } from './NotFound'

export function PatientDetail() {
  const id = usePatientId()
  return id === null ? <NotFound /> : <PatientRecord id={id} />
}

function PatientRecord({ id }: { id: number }) {
  const navigate = useNavigate()
  const { listUrl, state: listReturnState } = useListReturn()
  const queryClient = useQueryClient()
  const patientResult = useQuery(patientQuery(id))
  const deletePatient = useMutation({
    mutationFn: () => api.deletePatient(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.patient(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.patients })
      navigate(listUrl)
    },
  })

  if (patientResult.isPending) return <CircularProgress />
  if (patientResult.isError) {
    return <ErrorAlert error={patientResult.error} onRetry={() => patientResult.refetch()} />
  }

  const patient = patientResult.data
  const details = [
    ['Date of birth', `${formatDate(patient.date_of_birth)} (age ${patient.age})`],
    ['Blood type', patient.blood_type],
    ['Last visit', formatDateOrNone(patient.last_visit)],
    ['Email', patient.email],
    ['Phone', patient.phone],
    ['Address', patient.address],
    // Conditions and allergies appear in the Summary below, so the profile doesn't repeat them.
  ]

  function confirmDelete() {
    if (window.confirm(`Delete ${fullName(patient)} and all of their notes?`)) {
      deletePatient.mutate()
    }
  }

  return (
    <Stack spacing={3}>
      <Link component={RouterLink} to={listUrl} sx={{ alignSelf: 'flex-start' }}>
        ← Back to patients
      </Link>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" component="h2">
            {fullName(patient)}
          </Typography>
          <StatusChip status={patient.status} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to={`/patients/${id}/edit`}
            state={listReturnState}
            variant="outlined"
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={confirmDelete}
            disabled={deletePatient.isPending}
          >
            Delete
          </Button>
        </Stack>
      </Stack>
      {deletePatient.isError && <ErrorAlert error={deletePatient.error} />}
      <Section title="Profile">
        <DetailList
          sx={{
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {details.map(([label, value]) => (
            <Detail key={label} label={label}>
              {value}
            </Detail>
          ))}
        </DetailList>
      </Section>
      <PatientSummary patientId={id} />
      <PatientNotes patientId={id} />
    </Stack>
  )
}
