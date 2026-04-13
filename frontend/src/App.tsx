import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import SendEmail from './components/SendEmail';
import CandidateRegister from './components/CandidateRegister';
import CandidatePhoto from './components/CandidatePhoto';
import CandidateVideo from './components/CandidateVideo';
import CandidateProfile from './components/CandidateProfile';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/send-email" element={<ProtectedRoute><SendEmail /></ProtectedRoute>} />
            <Route path="/candidate-register" element={<CandidateRegister />} />
            <Route path="/candidate-photo/:id" element={<CandidatePhoto />} />
            <Route path="/candidate-video/:id" element={<CandidateVideo />} />
            <Route path="/candidate-profile/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
            <Route path="/" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
