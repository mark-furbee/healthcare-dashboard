import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
  type TextFieldProps,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api, ApiError } from '../api'
import { ErrorAlert } from '../components/ErrorAlert'
import { MultiSelectField } from '../components/MultiSelectField'
import { Section } from '../components/Section'
import { capitalize } from '../format'
import { allergiesQuery, conditionsQuery, patientQuery } from '../queries'
import { BLOOD_TYPES, STATUSES, type Patient, type PatientInput } from '../types'
import { useListReturn } from '../useListReturn'
import { usePatientId } from '../usePatientId'
import { NotFound } from './NotFound'

// en-CA formats dates as YYYY-MM-DD, the same format as a date input's value.
const notInFuture = (date: string) => date <= new Date().toLocaleDateString('en-CA')

// Mirrors the API's rules so most mistakes are caught before a request is sent.
// The API remains the authority; its errors are shown below the form.
// Each allergy or condition is checked as part of the list, so the message shows on the field.
const listOfNames = (label: string) =>
  z
    .array(z.string())
    .refine(
      (names) => names.every((name) => name.length <= 100),
      `Each ${label} must be 100 characters or fewer`,
    )

// Lengths match the API's limits (backend/app/schemas.py).
const schema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(80, 'First name must be 80 characters or fewer'),
  last_name: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(80, 'Last name must be 80 characters or fewer'),
  date_of_birth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(notInFuture, 'Date of birth cannot be in the future'),
  email: z
    .string()
    .trim()
    .max(254, 'Email must be 254 characters or fewer')
    .email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(5, 'Enter a valid phone number')
    .max(40, 'Phone must be 40 characters or fewer'),
  address: z
    .string()
    .trim()
    .min(3, 'Address is required')
    .max(300, 'Address must be 300 characters or fewer'),
  blood_type: z.enum(BLOOD_TYPES, { message: 'Select a blood type' }),
  status: z.enum(STATUSES),
  allergies: listOfNames('allergy'),
  conditions: listOfNames('condition'),
  last_visit: z
    .string()
    .refine((date) => !date || notInFuture(date), 'Last visit cannot be in the future'),
})

type FormValues = z.infer<typeof schema>

const isFormField = (name: string): name is keyof FormValues => name in schema.shape

// API errors that name a form field, such as a duplicate email, are shown on that field instead.
const fieldErrorsOf = (error: Error) =>
  error instanceof ApiError
    ? Object.entries(error.fieldErrors).filter(([name]) => isFormField(name))
    : []

const toInput = (values: FormValues): PatientInput => ({
  ...values,
  last_visit: values.last_visit || null,
})

const toFormValues = (patient: Patient): FormValues => ({
  ...patient,
  last_visit: patient.last_visit ?? '',
})

// Blood type has no default: preselecting one would risk recording a wrong value.
const EMPTY_FORM: Partial<FormValues> = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  email: '',
  phone: '',
  address: '',
  status: 'active',
  allergies: [],
  conditions: [],
  last_visit: '',
}

const GRID = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }
const DATE_FIELD: TextFieldProps = { type: 'date', slotProps: { inputLabel: { shrink: true } } }

export function NewPatient() {
  return <PatientForm />
}

export function EditPatient() {
  const id = usePatientId()
  return id === null ? <NotFound /> : <EditPatientForm id={id} />
}

function EditPatientForm({ id }: { id: number }) {
  const patient = useQuery(patientQuery(id))
  if (patient.isPending) return <CircularProgress />
  if (patient.isError) return <ErrorAlert error={patient.error} onRetry={() => patient.refetch()} />
  return <PatientForm patient={patient.data} />
}

function PatientForm({ patient }: { patient?: Patient }) {
  const navigate = useNavigate()
  const { state: listReturnState } = useListReturn()
  const queryClient = useQueryClient()
  const allergyOptions = useQuery(allergiesQuery)
  const conditionOptions = useQuery(conditionsQuery)
  const { control, handleSubmit, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: patient ? toFormValues(patient) : EMPTY_FORM,
  })
  const savePatient = useMutation({
    mutationFn: (input: PatientInput) =>
      patient ? api.updatePatient(patient.id, input) : api.createPatient(input),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient', saved.id] })
      queryClient.invalidateQueries({ queryKey: ['allergies'] })
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
      navigate(`/patients/${saved.id}`, { state: listReturnState })
    },
    onError: (error) => {
      for (const [name, message] of fieldErrorsOf(error)) {
        setError(name as keyof FormValues, { message })
      }
    },
  })

  const renderField = (name: keyof FormValues, label: string, props: TextFieldProps = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          value={field.value ?? ''}
          label={label}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
          fullWidth
          {...props}
        />
      )}
    />
  )

  const renderMultiSelect = (
    name: 'allergies' | 'conditions',
    label: string,
    options: typeof allergyOptions,
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <MultiSelectField
          label={label}
          options={options.data ?? []}
          loading={options.isPending}
          loadFailed={options.isError}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  )

  return (
    <Stack
      component="form"
      spacing={3}
      noValidate
      onSubmit={handleSubmit((values) => savePatient.mutate(toInput(values)))}
    >
      <Typography variant="h5" component="h2">
        {patient ? 'Edit patient' : 'New patient'}
      </Typography>
      <Section title="Personal information">
        <Box sx={GRID}>
          {renderField('first_name', 'First name')}
          {renderField('last_name', 'Last name')}
          {renderField('date_of_birth', 'Date of birth', DATE_FIELD)}
          {renderField('email', 'Email', { type: 'email' })}
          {renderField('phone', 'Phone', { type: 'tel' })}
          {renderField('address', 'Address')}
        </Box>
      </Section>
      <Section title="Medical information">
        <Box sx={GRID}>
          {renderField('blood_type', 'Blood type', {
            select: true,
            children: BLOOD_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            )),
          })}
          {renderField('status', 'Status', {
            select: true,
            children: STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {capitalize(status)}
              </MenuItem>
            )),
          })}
          {renderMultiSelect('allergies', 'Allergies', allergyOptions)}
          {renderMultiSelect('conditions', 'Conditions', conditionOptions)}
          {renderField('last_visit', 'Last visit', DATE_FIELD)}
        </Box>
      </Section>
      {savePatient.isError && fieldErrorsOf(savePatient.error).length === 0 && (
        <ErrorAlert error={savePatient.error} />
      )}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button onClick={() => navigate(-1)}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={savePatient.isPending}>
          Save
        </Button>
      </Stack>
    </Stack>
  )
}
