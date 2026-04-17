import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
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
  Grid,
  Stack,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Send as SendIcon,
  AutoAwesomeRounded,
  CloudUploadOutlined,
  BadgeOutlined,
  ArrowForwardRounded,
} from '@mui/icons-material';
import candidateJourneyIllustration from '../assets/candidate-journey-illustration.svg';

interface TechStackOption {
  id: number;
  name: string;
  category: string;
  group?: string;
}

const CandidateRegister = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [firstJobDate, setFirstJobDate] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [lastCompanySalary, setLastCompanySalary] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [pancardFile, setPancardFile] = useState<File | null>(null);

  const [techStacks, setTechStacks] = useState<TechStackOption[]>([]);
  const [selectedTechStacks, setSelectedTechStacks] = useState<TechStackOption[]>([]);
  const [techLoading, setTechLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/candidate-registration/tech-stacks')
      .then(res => setTechStacks(res.data))
      .catch(() => setError('Failed to load tech stacks'))
      .finally(() => setTechLoading(false));
  }, []);

  const groupedOptions: TechStackOption[] = techStacks.map(ts => ({
    ...ts,
    group: ts.category,
  }));

  const handleFileChange = (setter: (f: File | null) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.files?.[0] ?? null);
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (selectedTechStacks.length === 0) {
      setError('Please select at least one tech stack');
      return;
    }
    if (!aadhaarFile) {
      setError('Please upload your Aadhaar card');
      return;
    }
    if (!pancardFile) {
      setError('Please upload your PAN card');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('firstName', firstName);
    formData.append('middleName', middleName);
    formData.append('lastName', lastName);
    formData.append('email', email);
    formData.append('currentAddress', currentAddress);
    formData.append('permanentAddress', permanentAddress);
    formData.append('workExperience', workExperience);
    if (firstJobDate) formData.append('firstJobDate', firstJobDate);
    if (lastWorkingDay) formData.append('lastWorkingDay', lastWorkingDay);
    if (lastCompanySalary) formData.append('lastCompanySalary', lastCompanySalary);
    selectedTechStacks.forEach(ts => formData.append('techStackIds', String(ts.id)));
    formData.append('aadhaarFile', aadhaarFile);
    formData.append('pancardFile', pancardFile);

    try {
      const res = await axios.post('/api/candidate-registration/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/candidate-photo/${res.data.id}`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f4f7fb 0%, #eef4ff 100%)' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(15, 23, 42, 0.84)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Toolbar>
          <PersonAddIcon aria-hidden="true" sx={{ mr: 1.25 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Candidate Registration
          </Typography>
          <Chip label="Guided flow" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 3,
            borderRadius: 4,
            color: '#fff',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0F172A 0%, #1D4ED8 58%, #14B8A6 100%)',
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                icon={<AutoAwesomeRounded sx={{ color: '#fff !important' }} />}
                label="AI-assisted journey"
                sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }}
              />
              <Typography variant="h4" sx={{ mb: 1.5 }}>
                A cleaner and more professional onboarding experience.
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.86)', mb: 2.5 }}>
                Complete the form once and continue seamlessly into photo capture, verification, and AI-generated assessment.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip label="Identity ready" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                <Chip label="Assessment enabled" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                <Chip label="Fast review" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                component="img"
                src={candidateJourneyIllustration}
                alt="Abstract illustration representing the candidate journey"
                sx={{ width: '100%', maxWidth: 420, display: 'block', ml: { md: 'auto' } }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
          <Typography variant="h5" sx={{ mb: 0.75, fontWeight: 700 }}>
            Registration Form
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Please provide your details to begin the assessment process.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <BadgeOutlined color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Personal details
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField label="First Name" fullWidth required value={firstName} onChange={e => setFirstName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Middle Name" fullWidth value={middleName} onChange={e => setMiddleName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Last Name" fullWidth required value={lastName} onChange={e => setLastName(e.target.value)} />
              </Grid>

              <Grid item xs={12}>
                <TextField label="Email" type="email" fullWidth required value={email} onChange={e => setEmail(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Current Address" fullWidth required multiline rows={2} value={currentAddress} onChange={e => setCurrentAddress(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Permanent Address" fullWidth required multiline rows={2} value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} />
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <CloudUploadOutlined color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Documents and skills
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Aadhaar Card *
                </Typography>
                <Button variant="outlined" component="label" fullWidth sx={{ justifyContent: 'flex-start', py: 1.4 }}>
                  {aadhaarFile ? aadhaarFile.name : 'Upload Aadhaar card'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    aria-label="Upload Aadhaar card"
                    onChange={handleFileChange(setAadhaarFile)}
                  />
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  PAN Card *
                </Typography>
                <Button variant="outlined" component="label" fullWidth sx={{ justifyContent: 'flex-start', py: 1.4 }}>
                  {pancardFile ? pancardFile.name : 'Upload PAN card'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    aria-label="Upload PAN card"
                    onChange={handleFileChange(setPancardFile)}
                  />
                </Button>
              </Grid>

              <Grid item xs={12}>
                {techLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} aria-label="Loading tech stacks" />
                  </Box>
                ) : (
                  <Autocomplete
                    multiple
                    options={groupedOptions}
                    groupBy={option => option.group || ''}
                    getOptionLabel={option => option.name}
                    value={selectedTechStacks}
                    onChange={(_, newValue) => setSelectedTechStacks(newValue)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.name}
                          {...getTagProps({ index })}
                          key={option.id}
                          sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #0F9D8A 100%)', color: 'white' }}
                        />
                      ))
                    }
                    renderInput={params => (
                      <TextField {...params} label="Tech Stacks *" placeholder="Search and select tech stacks..." />
                    )}
                  />
                )}
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Professional background
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Work Experience"
                  fullWidth
                  multiline
                  rows={3}
                  value={workExperience}
                  onChange={e => setWorkExperience(e.target.value)}
                  placeholder="Describe your work experience..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Job Date"
                  type="date"
                  fullWidth
                  value={firstJobDate}
                  onChange={e => setFirstJobDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Working Day"
                  type="date"
                  fullWidth
                  value={lastWorkingDay}
                  onChange={e => setLastWorkingDay(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Last Company Salary (₹)"
                  type="number"
                  fullWidth
                  value={lastCompanySalary}
                  onChange={e => setLastCompanySalary(e.target.value)}
                  placeholder="e.g. 800000"
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} color="inherit" aria-label="Submitting registration" /> : <ArrowForwardRounded />}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #0F9D8A 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #4338CA 0%, #0B8C7B 100%)' },
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit and continue'}
                </Button>
                {!loading && (
                  <Stack direction="row" justifyContent="center" sx={{ mt: 1.5 }}>
                    <Chip icon={<SendIcon />} label="Next: Photo capture" variant="outlined" />
                  </Stack>
                )}
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CandidateRegister;
