import { useState, FormEvent, MouseEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  AutoAwesomeRounded,
  ShieldRounded,
  InsightsRounded,
} from '@mui/icons-material';
import aiWorkspaceIllustration from '../assets/ai-workspace-illustration.svg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const role = response.data.role || 'EMPLOYEE';
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', username);
      localStorage.setItem('role', role);
      localStorage.setItem('userRole', role);
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          <Card
            sx={{
              p: { xs: 3, md: 4 },
              background: 'linear-gradient(145deg, #0F172A 0%, #1D4ED8 55%, #0F9D8A 100%)',
              color: '#fff',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Chip
              icon={<AutoAwesomeRounded sx={{ color: '#fff !important' }} />}
              label="AI Hiring Workspace"
              sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }}
            />
            <Typography variant="h4" sx={{ mb: 1.5 }}>
              Professional hiring operations with a refined experience.
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.86)', mb: 3 }}>
              Streamline candidate onboarding, identity checks, and AI-led assessments from one calm, modern workspace.
            </Typography>

            <Stack spacing={1.25} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <ShieldRounded fontSize="small" />
                <Typography variant="body2">Secure sign-in and protected internal flows</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <InsightsRounded fontSize="small" />
                <Typography variant="body2">Smarter candidate evaluation and reporting</Typography>
              </Box>
            </Stack>

            <Box
              component="img"
              src={aiWorkspaceIllustration}
              alt="Abstract illustration of a modern AI-enabled workspace"
              sx={{ width: '100%', maxWidth: 460, display: 'block', ml: { md: 'auto' } }}
            />
          </Card>

          <Card sx={{ display: 'flex', alignItems: 'center' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 }, width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, rgba(79,70,229,0.14), rgba(15,157,138,0.16))',
                  }}
                >
                  <LockOutlined aria-hidden="true" sx={{ color: '#4F46E5', fontSize: 30 }} />
                </Box>
              </Box>

              <Typography variant="h4" component="h1" sx={{ textAlign: 'center', mb: 1 }}>
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 3 }}>
                Sign in to continue to the hiring dashboard.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  required
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  size="large"
                  sx={{
                    mt: 1,
                    py: 1.4,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #0F9D8A 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4338CA 0%, #0B8C7B 100%)',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" aria-label="Signing in" /> : 'Sign in'}
                </Button>
              </Box>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Don&apos;t have an account?{' '}
                  <RouterLink
                    to="/register"
                    style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 700 }}
                  >
                    Create one
                  </RouterLink>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
