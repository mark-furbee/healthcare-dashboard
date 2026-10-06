import {
  Card,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { ErrorAlert } from '../components/ErrorAlert'
import { Section } from '../components/Section'
import { StatusChip } from '../components/StatusChip'
import { formatDate, fullName } from '../format'
import { patientsQuery } from '../queries'

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <Card sx={{ p: 2, flex: 1 }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography variant="h4">{value ?? <Skeleton width={60} />}</Typography>
    </Card>
  )
}

export function Dashboard() {
  // The list endpoint reports totals, so these counts need no dedicated statistics endpoint.
  const recent = useQuery(patientsQuery({ page_size: 5, sort: 'last_visit', order: 'desc' }))
  const active = useQuery(patientsQuery({ page_size: 1, status: 'active' }))
  const error = recent.error ?? active.error

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h2">
        Dashboard
      </Typography>
      {error && (
        <ErrorAlert
          error={error}
          onRetry={() => {
            recent.refetch()
            active.refetch()
          }}
        />
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Stat label="Total patients" value={recent.data?.total} />
        <Stat label="Active patients" value={active.data?.total} />
      </Stack>
      <Section title="Recent visits">
        <List disablePadding>
          {recent.data?.items.map((patient) => (
            <ListItemButton key={patient.id} component={RouterLink} to={`/patients/${patient.id}`}>
              <ListItemText
                primary={fullName(patient)}
                secondary={`Last visit: ${patient.last_visit ? formatDate(patient.last_visit) : 'None'}`}
              />
              <StatusChip status={patient.status} />
            </ListItemButton>
          ))}
        </List>
      </Section>
    </Stack>
  )
}
