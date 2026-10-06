import { Box, Button, Link, Stack, Typography, useMediaQuery, type Theme } from '@mui/material'
import { NavLink, Route, Link as RouterLink, Routes } from 'react-router-dom'
import { ThemePicker } from './components/ThemePicker'
import { Dashboard } from './pages/Dashboard'
import { NotFound } from './pages/NotFound'
import { PatientDetail } from './pages/PatientDetail'
import { EditPatient, NewPatient } from './pages/PatientForm'
import { Patients } from './pages/Patients'

const SIDEBAR_WIDTH = 200
const NAV_LINK_STYLE = { justifyContent: 'flex-start', '&.active': { bgcolor: 'action.selected' } }

function Navigation({ direction }: { direction: 'row' | 'column' }) {
  return (
    <Stack component="nav" direction={direction} spacing={1}>
      <Button component={NavLink} to="/" end color="secondary" sx={NAV_LINK_STYLE}>
        Dashboard
      </Button>
      <Button component={NavLink} to="/patients" color="secondary" sx={NAV_LINK_STYLE}>
        Patients
      </Button>
    </Stack>
  )
}

export function App() {
  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'), { noSsr: true })

  return (
    // The page fills the viewport and only the main area scrolls, so the sidebar stays in view.
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          px: { xs: 2, md: 3 },
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Link component={RouterLink} to="/" underline="none" color="inherit" sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="h1">
            Healthcare Dashboard
          </Typography>
        </Link>
        {/* Small screens have no sidebar, so its links and the theme picker move here. */}
        {!isDesktop && (
          <>
            <Navigation direction="row" />
            <ThemePicker />
          </>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {isDesktop && (
          <Box
            component="aside"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: SIDEBAR_WIDTH,
              flexShrink: 0,
              p: 2,
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            <Navigation direction="column" />
            <ThemePicker />
          </Box>
        )}
        <Box
          component="main"
          sx={{ flexGrow: 1, minWidth: 0, overflow: 'auto', p: { xs: 2, md: 3 } }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/new" element={<NewPatient />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/patients/:id/edit" element={<EditPatient />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  )
}
