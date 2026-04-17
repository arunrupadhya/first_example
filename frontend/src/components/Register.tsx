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
  PersonAddRounded,
  Visibility,
  VisibilityOff,
  AutoAwesomeRounded,
  GroupAddRounded,
  CheckCircleRounded,
} from '@mui/icons-material';
import candidateJourneyIllustration from '../assets/candidate-journey-illustration.svg';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match!');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long!');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/auth/register', { username, password });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Registration failed. Username may already exist.');
      } else {
        setError('Registration failed. Username may already exist.');
      }
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
            gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          <Card
            sx={{
              p: { xs: 3, md: 4 },
              background: 'linear-gradient(145deg, #ffffff 0%, #eef4ff 65%, #ecfdf5 100%)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Chip icon={<AutoAwesomeRounded />} label="Professional onboarding" color="primary" sx={{ mb: 2 }} />
              <Typography variant="h4" sx={{ mb: 1.5 }}>
                Create your workspace account with confidence.
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                Start with a cleaner, more modern interface designed for fast access to candidate workflows and assessment management.
              </Typography>

              <Stack spacing={1.25} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <CheckCircleRounded color="success" fontSize="small" />
                  <Typography variant="body2">Consistent dashboard experience</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <GroupAddRounded color="primary" fontSize="small" />
                  <Typography variant="body2">Faster team onboarding for internal users</Typography>
                </Box>
              </Stack>

              <Box
                component="img"
                src={candidateJourneyIllustration}
                alt="Abstract illustration representing a guided candidate journey"
                sx={{ width: '100%', maxWidth: 440 }}
              />
            </CardContent>
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
                  <PersonAddRounded aria-hidden="true" sx={{ fontSize: 30, color: '#4F46E5' }} />
                </Box>
              </Box>

              <Typography variant="h4" component="h1" sx={{ textAlign: 'center', mb: 1 }}>
                Create account
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 3 }}>
                Set up your access and continue to the platform.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  disabled={loading}
                  required
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={loading}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          onClick={handleClickShowConfirmPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                  {loading ? <CircularProgress size={24} color="inherit" aria-label="Creating account" /> : 'Create account'}
                </Button>
              </Box>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Already have an account?{' '}
                  <RouterLink
                    to="/login"
                    style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 700 }}
                  >
                    Sign in
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

export default Register;
