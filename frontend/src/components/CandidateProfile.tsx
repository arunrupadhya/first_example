import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Email,
  Home,
  Work,
  CalendarMonth,
  AttachMoney,
  Description,
  PhotoCamera,
  Videocam,
  Code
} from '@mui/icons-material';

interface TechStack {
  id: number;
  name: string;
  category: string;
}

interface CandidateDetail {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  currentAddress: string;
  permanentAddress: string;
  workExperience?: string;
  firstJobDate?: string;
  lastWorkingDay?: string;
  lastCompanySalary?: number;
  createdAt: string;
  techStacks: TechStack[];
  aadhaarUrl?: string;
  pancardUrl?: string;
  photoUrl?: string;
  videoUrl?: string;
}

const CandidateProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'HR' && role !== 'PRACTICE') {
      navigate('/dashboard');
      return;
    }

    axios.get(`/api/candidates/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setCandidate(res.data))
      .catch(err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login');
        } else {
          setError('Failed to load candidate details.');
        }
      })
      .finally(() => setLoading(false));
  }, [id, token, navigate]);

  const fullName = candidate
    ? [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(' ')
    : '';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (amount?: number) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !candidate) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Candidate not found.'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Container>
    );
  }

  return (
    <Box sx={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Candidate Profile
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Card */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
          {candidate.photoUrl ? (
            <Box
              component="img"
              src={candidate.photoUrl}
              alt={fullName}
              sx={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #667eea' }}
            />
          ) : (
            <Box sx={{
              width: 100, height: 100, borderRadius: '50%', backgroundColor: '#667eea',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Person sx={{ fontSize: 50, color: 'white' }} />
            </Box>
          )}
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{fullName}</Typography>
            <Typography variant="body1" sx={{ color: '#555', display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Email fontSize="small" /> {candidate.email}
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              Applied: {formatDate(candidate.createdAt)}
            </Typography>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person sx={{ color: '#667eea' }} /> Personal Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <InfoRow label="First Name" value={candidate.firstName} />
                <InfoRow label="Middle Name" value={candidate.middleName || '—'} />
                <InfoRow label="Last Name" value={candidate.lastName} />
                <InfoRow label="Email" value={candidate.email} />
              </CardContent>
            </Card>
          </Grid>

          {/* Address */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home sx={{ color: '#667eea' }} /> Address
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <InfoRow label="Current Address" value={candidate.currentAddress} />
                <InfoRow label="Permanent Address" value={candidate.permanentAddress} />
              </CardContent>
            </Card>
          </Grid>

          {/* Work Experience */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Work sx={{ color: '#667eea' }} /> Work Experience
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <InfoRow label="Experience" value={candidate.workExperience || '—'} />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                  <CalendarMonth fontSize="small" sx={{ color: '#999' }} />
                  <Typography variant="body2">
                    <strong>First Job:</strong> {formatDate(candidate.firstJobDate)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                  <CalendarMonth fontSize="small" sx={{ color: '#999' }} />
                  <Typography variant="body2">
                    <strong>Last Working Day:</strong> {formatDate(candidate.lastWorkingDay)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <AttachMoney fontSize="small" sx={{ color: '#999' }} />
                  <Typography variant="body2">
                    <strong>Last Salary:</strong> {formatCurrency(candidate.lastCompanySalary)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tech Stacks */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Code sx={{ color: '#667eea' }} /> Tech Stacks
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {candidate.techStacks.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {candidate.techStacks.map(ts => (
                      <Chip key={ts.id} label={ts.name} color="primary" variant="outlined" size="small"
                        sx={{ borderColor: '#667eea', color: '#667eea' }} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#999' }}>No tech stacks listed</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Documents */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description sx={{ color: '#667eea' }} /> Documents
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {candidate.aadhaarUrl ? (
                    <Button variant="outlined" href={candidate.aadhaarUrl} target="_blank" rel="noopener noreferrer"
                      startIcon={<Description />} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                      View Aadhaar Document
                    </Button>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#999' }}>Aadhaar: Not uploaded</Typography>
                  )}
                  {candidate.pancardUrl ? (
                    <Button variant="outlined" href={candidate.pancardUrl} target="_blank" rel="noopener noreferrer"
                      startIcon={<Description />} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                      View PAN Card Document
                    </Button>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#999' }}>PAN Card: Not uploaded</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Photo & Video */}
          <Grid item xs={12} md={6}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhotoCamera sx={{ color: '#667eea' }} /> Media
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {candidate.photoUrl && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Photo</Typography>
                    <Box
                      component="img"
                      src={candidate.photoUrl}
                      alt="Candidate photo"
                      sx={{ maxWidth: '100%', maxHeight: 250, borderRadius: 2, objectFit: 'contain' }}
                    />
                  </Box>
                )}
                {candidate.videoUrl ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Videocam fontSize="small" /> Video Introduction
                    </Typography>
                    <Box
                      component="video"
                      controls
                      src={candidate.videoUrl}
                      sx={{ maxWidth: '100%', borderRadius: 2 }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#999' }}>No video uploaded</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" sx={{ color: '#999', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 }}>
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export default CandidateProfile;
