import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';

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

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', username);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={8}
          sx={{
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
        >
          <CardContent sx={{ padding: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
              <Lock sx={{ fontSize: 40, color: '#667eea' }} />
            </Box>

            <Typography
              variant="h4"
              component="h1"
              sx={{
                textAlign: 'center',
                marginBottom: 1,
                fontWeight: 700,
                color: '#2c3e50'
              }}
            >
              Welcome Back
            </Typography>

            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                marginBottom: 3,
                color: '#7f8c8d'
              }}
            >
              Sign in to your account to continue
            </Typography>

            {error && <Alert severity="error" sx={{ marginBottom: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="outlined"
                placeholder="Enter your username"
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                variant="outlined"
                placeholder="Enter your password"
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
              />

              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  marginTop: 2,
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f92 100%)'
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', marginTop: 3 }}>
              <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                Don't have an account?{' '}
                <Link
                  href="/register"
                  sx={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;