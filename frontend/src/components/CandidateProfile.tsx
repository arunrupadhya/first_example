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
  IconButton,
  TextField
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
  Code,
  VerifiedUser,
  ThumbUp,
  ThumbDown,
  HowToReg
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
  selectionStatus?: string;
  selectionNotes?: string;
  selectedBy?: string;
  selectedAt?: string;
}

interface VerificationRecord {
  id: number;
  roundNumber: number;
  question: string;
  faceMatchResult: string;
  faceMatchConfidence: number;
  aiAnalysisDetails: string;
  createdAt: string;
  videoUrl?: string;
  snapshotUrl?: string;
}

const CandidateProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<string | null>(null);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [assessmentMaxScore, setAssessmentMaxScore] = useState<number | null>(null);
  const [selectionStatus, setSelectionStatus] = useState<string>('PENDING');
  const [selectionNotes, setSelectionNotes] = useState('');
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionSuccess, setSelectionSuccess] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const role = localStorage.getItem('role') || localStorage.getItem('userRole');
    if (role !== 'HR' && role !== 'PRACTICE') {
      navigate('/dashboard');
      return;
    }

    axios.get(`/api/candidates/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setCandidate(res.data);
        if (res.data.selectionStatus) {
          setSelectionStatus(res.data.selectionStatus);
          setSelectionNotes(res.data.selectionNotes || '');
        }
        // Fetch identity verification results
        axios.get(`/api/identity-verification/${id}/results`)
          .then(vRes => {
            setVerifications(vRes.data.verifications || []);
            if (vRes.data.assessmentId) {
              setAssessmentId(vRes.data.assessmentId);
              setAssessmentStatus(vRes.data.assessmentStatus);
              setAssessmentScore(vRes.data.assessmentScore ?? null);
              setAssessmentMaxScore(vRes.data.assessmentMaxScore ?? null);
            }
          })
          .catch(() => { /* ignore if no verifications */ });
      })
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

  const handleSelection = async (status: 'SELECTED' | 'NOT_SELECTED') => {
    setSelectionLoading(true);
    setSelectionSuccess('');
    try {
      await axios.put(`/api/candidates/${id}/selection`, {
        selectionStatus: status,
        selectionNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectionStatus(status);
      setSelectionSuccess(`Candidate marked as ${status === 'SELECTED' ? 'Selected' : 'Not Selected'}`);
      if (status === 'SELECTED' && candidate) {
        setTimeout(() => {
          navigate('/send-email', {
            state: {
              candidateId: Number(id),
              candidateEmail: candidate.email,
              candidateName: fullName,
              candidateTechStacks: candidate.techStacks.map(ts => ts.name)
            }
          });
        }, 1000);
      }
    } catch {
      setSelectionSuccess('');
    } finally {
      setSelectionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress aria-label="Loading candidate profile" />
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
          <IconButton edge="start" color="inherit" aria-label="Back to dashboard" onClick={() => navigate('/dashboard')} sx={{ mr: 1 }}>
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
              alt={`Profile photo of ${fullName}`}
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
                  <Person aria-hidden="true" sx={{ color: '#667eea' }} /> Personal Information
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
                  <Home aria-hidden="true" sx={{ color: '#667eea' }} /> Address
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
                  <Work aria-hidden="true" sx={{ color: '#667eea' }} /> Work Experience
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
                  <Code aria-hidden="true" sx={{ color: '#667eea' }} /> Tech Stacks
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
                  <Description aria-hidden="true" sx={{ color: '#667eea' }} /> Documents
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
                  <PhotoCamera aria-hidden="true" sx={{ color: '#667eea' }} /> Media
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {candidate.photoUrl && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Photo</Typography>
                    <Box
                      component="img"
                      src={candidate.photoUrl}
                      alt={`Photo of ${fullName}`}
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
                      aria-label={`Video introduction by ${fullName}`}
                      sx={{ maxWidth: '100%', borderRadius: 2 }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#999' }}>No video uploaded</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Identity Verification Results */}
          {verifications.length > 0 && (
            <Grid item xs={12}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedUser aria-hidden="true" sx={{ color: '#667eea' }} /> Identity Verification History
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {verifications.map(v => (
                    <Paper key={v.id} elevation={0} sx={{
                      p: 2, mb: 2, borderRadius: 2,
                      border: `1px solid ${v.faceMatchResult === 'MATCH' ? '#27ae60' : v.faceMatchResult === 'MISMATCH' ? '#e74c3c' : '#f39c12'}`,
                      background: v.faceMatchResult === 'MATCH' ? '#f0fff4' : v.faceMatchResult === 'MISMATCH' ? '#fff5f5' : '#fffbf0'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Round {v.roundNumber}
                        </Typography>
                        <Chip
                          label={v.faceMatchResult}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            color: 'white',
                            backgroundColor: v.faceMatchResult === 'MATCH' ? '#27ae60' : v.faceMatchResult === 'MISMATCH' ? '#e74c3c' : '#f39c12'
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#555', mb: 0.5 }}>
                        <strong>Question:</strong> {v.question}
                      </Typography>
                      {v.faceMatchConfidence > 0 && (
                        <Typography variant="body2" sx={{ color: '#555', mb: 0.5 }}>
                          <strong>Confidence:</strong> {v.faceMatchConfidence.toFixed(1)}%
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ color: '#777' }}>
                        {v.aiAnalysisDetails}
                      </Typography>
                      {v.videoUrl && (
                        <Box sx={{ mt: 1 }}>
                          <Box
                            component="video"
                            controls
                            src={v.videoUrl}
                            aria-label={`Verification video for round ${v.roundNumber}`}
                            sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 2 }}
                          />
                        </Box>
                      )}
                      <Typography variant="caption" sx={{ color: '#999', mt: 1, display: 'block' }}>
                        {new Date(v.createdAt).toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Assessment Report */}
          {assessmentId && (
            <Grid item xs={12}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Work aria-hidden="true" sx={{ color: '#764ba2' }} /> Assessment Report
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Paper elevation={0} sx={{
                    p: 3, borderRadius: 2,
                    border: `1px solid ${assessmentStatus === 'EVALUATED' ? '#667eea' : '#f39c12'}`,
                    background: assessmentStatus === 'EVALUATED' ? '#f0f4ff' : '#fffbf0'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Technical Assessment
                      </Typography>
                      <Chip
                        label={assessmentStatus || 'PENDING'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          color: 'white',
                          backgroundColor: assessmentStatus === 'EVALUATED' ? '#27ae60' :
                            assessmentStatus === 'SUBMITTED' ? '#2980b9' :
                              assessmentStatus === 'IN_PROGRESS' ? '#f39c12' : '#95a5a6'
                        }}
                      />
                    </Box>
                    {assessmentScore != null && assessmentMaxScore != null && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                          {assessmentScore} / {assessmentMaxScore}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#777' }}>
                          Score: {((assessmentScore / assessmentMaxScore) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                    <Button
                      variant="contained"
                      onClick={() => navigate(`/assessment-report/${assessmentId}`)}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)' }
                      }}
                    >
                      View Detailed Report
                    </Button>
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Selection Decision */}
          <Grid item xs={12}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HowToReg aria-hidden="true" sx={{ color: '#667eea' }} /> Selection Decision
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {selectionStatus !== 'PENDING' ? (
                  <Paper elevation={0} sx={{
                    p: 3, borderRadius: 2,
                    border: `1px solid ${selectionStatus === 'SELECTED' ? '#27ae60' : '#e74c3c'}`,
                    background: selectionStatus === 'SELECTED' ? '#f0fff4' : '#fff5f5'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      {selectionStatus === 'SELECTED' ? (
                        <ThumbUp sx={{ color: '#27ae60', fontSize: 32 }} />
                      ) : (
                        <ThumbDown sx={{ color: '#e74c3c', fontSize: 32 }} />
                      )}
                      <Typography variant="h5" sx={{ fontWeight: 700, color: selectionStatus === 'SELECTED' ? '#27ae60' : '#e74c3c' }}>
                        {selectionStatus === 'SELECTED' ? 'Selected for Next Round' : 'Not Selected'}
                      </Typography>
                    </Box>
                    {candidate?.selectedBy && (
                      <Typography variant="body2" sx={{ color: '#777', mb: 0.5 }}>
                        Decision by: <strong>{candidate.selectedBy}</strong>
                        {candidate.selectedAt && ` on ${formatDate(candidate.selectedAt)}`}
                      </Typography>
                    )}
                    {selectionNotes && (
                      <Typography variant="body2" sx={{ color: '#555', mt: 1 }}>
                        <strong>Notes:</strong> {selectionNotes}
                      </Typography>
                    )}
                    {selectionStatus === 'SELECTED' && (
                      <Button
                        variant="contained"
                        onClick={() => navigate('/send-email', {
                          state: {
                            candidateId: Number(id),
                            candidateEmail: candidate?.email,
                            candidateName: fullName,
                            candidateTechStacks: candidate?.techStacks.map(ts => ts.name)
                          }
                        })}
                        startIcon={<Email />}
                        sx={{
                          mt: 2,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)' }
                        }}
                      >
                        Send Selection Email
                      </Button>
                    )}
                  </Paper>
                ) : (
                  <Box>
                    {selectionSuccess && (
                      <Alert severity="success" sx={{ mb: 2 }}>{selectionSuccess}</Alert>
                    )}
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Selection Notes (optional)"
                      value={selectionNotes}
                      onChange={(e) => setSelectionNotes(e.target.value)}
                      sx={{ mb: 3 }}
                      placeholder="Add any notes about the decision..."
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={selectionLoading ? <CircularProgress size={20} color="inherit" /> : <ThumbUp />}
                        disabled={selectionLoading}
                        onClick={() => handleSelection('SELECTED')}
                        sx={{
                          flex: 1,
                          py: 1.5,
                          background: '#27ae60',
                          fontWeight: 700,
                          fontSize: 16,
                          '&:hover': { background: '#229954' }
                        }}
                      >
                        Select for Next Round
                      </Button>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={selectionLoading ? <CircularProgress size={20} color="inherit" /> : <ThumbDown />}
                        disabled={selectionLoading}
                        onClick={() => handleSelection('NOT_SELECTED')}
                        sx={{
                          flex: 1,
                          py: 1.5,
                          background: '#e74c3c',
                          fontWeight: 700,
                          fontSize: 16,
                          '&:hover': { background: '#c0392b' }
                        }}
                      >
                        Not Selected
                      </Button>
                    </Box>
                  </Box>
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
