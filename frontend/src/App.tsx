import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

const Register = lazy(() => import('./components/Register'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SendEmail = lazy(() => import('./components/SendEmail'));
const CandidateRegister = lazy(() => import('./components/CandidateRegister'));
const CandidatePhoto = lazy(() => import('./components/CandidatePhoto'));
const CandidateVideo = lazy(() => import('./components/CandidateVideo'));
const CandidateProfile = lazy(() => import('./components/CandidateProfile'));
const IdentityVerification = lazy(() => import('./components/IdentityVerification'));
const CandidateAssessment = lazy(() => import('./components/CandidateAssessment'));
const AssessmentReport = lazy(() => import('./components/AssessmentReport'));

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4F46E5',
    },
    secondary: {
      main: '#0F9D8A',
    },
    background: {
      default: '#F4F7FB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: 'Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: '100vh',
          backgroundColor: '#F4F7FB',
          backgroundImage:
            'radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 28%), radial-gradient(circle at bottom right, rgba(15, 157, 138, 0.10), transparent 24%)',
        },
        '#root': {
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: '0 14px 30px rgba(79, 70, 229, 0.18)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: alpha('#FFFFFF', 0.98),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
          onFocus={(e) => {
            e.currentTarget.style.position = 'fixed';
            e.currentTarget.style.left = '16px';
            e.currentTarget.style.top = '16px';
            e.currentTarget.style.width = 'auto';
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.overflow = 'visible';
            e.currentTarget.style.zIndex = '9999';
            e.currentTarget.style.padding = '12px 24px';
            e.currentTarget.style.background = '#4F46E5';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderRadius = '12px';
            e.currentTarget.style.textDecoration = 'none';
            e.currentTarget.style.fontWeight = '700';
          }}
          onBlur={(e) => {
            e.currentTarget.style.position = 'absolute';
            e.currentTarget.style.left = '-9999px';
            e.currentTarget.style.width = '1px';
            e.currentTarget.style.height = '1px';
            e.currentTarget.style.overflow = 'hidden';
          }}
        >
          Skip to main content
        </a>
        <div className="App" id="main-content" role="application" aria-label="Candidate hiring platform">
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
              </Box>
            }
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/send-email" element={<ProtectedRoute><SendEmail /></ProtectedRoute>} />
              <Route path="/candidate-register" element={<CandidateRegister />} />
              <Route path="/candidate-photo/:id" element={<CandidatePhoto />} />
              <Route path="/candidate-video/:id" element={<CandidateVideo />} />
              <Route path="/identity-verification/:id" element={<IdentityVerification />} />
              <Route path="/candidate-assessment/:id" element={<CandidateAssessment />} />
              <Route path="/assessment-report/:id" element={<ProtectedRoute><AssessmentReport /></ProtectedRoute>} />
              <Route path="/candidate-profile/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
              <Route path="/" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
