import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Settings from './pages/Settings';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1a73e8',
    },
    secondary: {
      main: '#ff6d00',
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={setIsAuthenticated} />} />
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/instances" element={<Instances />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;