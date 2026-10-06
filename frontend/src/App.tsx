import { Typography } from '@mui/material'
import { Route, Routes } from 'react-router-dom'

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Typography variant="h6" component="h1">
            Healthcare Dashboard
          </Typography>
        }
      />
    </Routes>
  )
}
