import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon
} from '@mui/icons-material';

const SendEmail = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [techStacks, setTechStacks] = useState([]);
  const [selectedTechStacks, setSelectedTechStacks] = useState([]);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [techLoading, setTechLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    axios.get('/api/candidate/tech-stacks', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setTechStacks(res.data);
    }).catch(err => {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
      }
    }).finally(() => setTechLoading(false));
  }, [token, navigate]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await axios.post('/api/candidate/send-email', {
        candidateEmail,
        techStacks: selectedTechStacks.map(t => t.name),
        subject,
        content
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message);
      setCandidateEmail('');
      setSelectedTechStacks([]);
      setSubject('');
      setContent('');
    } catch (err) {
      if (err.response && err.response.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : err.response.data.message || 'Failed to send email');
      } else {
        setError('Failed to send email. Please check SMTP configuration.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Group tech stacks by category for the autocomplete
  const groupedOptions = techStacks.map(ts => ({
    ...ts,
    group: ts.category
  }));

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <AppBar position="static" sx={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/dashboard')} sx={{ color: '#667eea', mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <EmailIcon sx={{ color: '#667eea', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#2c3e50', fontWeight: 600 }}>
            Send Email to Candidate
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: '#2c3e50' }}>
            Compose Email
          </Typography>

          {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Box component="form" onSubmit={handleSend}>
            <TextField
              label="Candidate Email"
              type="email"
              fullWidth
              required
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="candidate@example.com"
            />

            {techLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Autocomplete
                multiple
                options={groupedOptions}
                groupBy={(option) => option.group}
                getOptionLabel={(option) => option.name}
                value={selectedTechStacks}
                onChange={(_, newValue) => setSelectedTechStacks(newValue)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                      key={option.id}
                      sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tech Stack"
                    placeholder="Search and select tech stacks..."
                    required={selectedTechStacks.length === 0}
                  />
                )}
                sx={{ mb: 3 }}
              />
            )}

            <TextField
              label="Subject"
              fullWidth
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              sx={{ mb: 3 }}
            />

            <TextField
              label="Email Content"
              fullWidth
              required
              multiline
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 4,
                py: 1.5,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)',
                }
              }}
            >
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SendEmail;
