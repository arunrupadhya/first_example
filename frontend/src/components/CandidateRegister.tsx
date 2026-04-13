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
  Grid
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Send as SendIcon
} from '@mui/icons-material';

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
    group: ts.category
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
        headers: { 'Content-Type': 'multipart/form-data' }
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
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <AppBar position="static" sx={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <PersonAddIcon sx={{ color: '#667eea', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#2c3e50', fontWeight: 600 }}>
            Candidate Registration
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: '#2c3e50' }}>
            Registration Form
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* Name Fields */}
              <Grid item xs={12} sm={4}>
                <TextField label="First Name" fullWidth required value={firstName}
                  onChange={e => setFirstName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Middle Name" fullWidth value={middleName}
                  onChange={e => setMiddleName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Last Name" fullWidth required value={lastName}
                  onChange={e => setLastName(e.target.value)} />
              </Grid>

              {/* Email */}
              <Grid item xs={12}>
                <TextField label="Email" type="email" fullWidth required value={email}
                  onChange={e => setEmail(e.target.value)} />
              </Grid>

              {/* Addresses */}
              <Grid item xs={12}>
                <TextField label="Current Address" fullWidth required multiline rows={2} value={currentAddress}
                  onChange={e => setCurrentAddress(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Permanent Address" fullWidth required multiline rows={2} value={permanentAddress}
                  onChange={e => setPermanentAddress(e.target.value)} />
              </Grid>

              {/* Document Uploads */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Aadhaar Card *
                </Typography>
                <Button variant="outlined" component="label" fullWidth
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}>
                  {aadhaarFile ? aadhaarFile.name : 'Choose file...'}
                  <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange(setAadhaarFile)} />
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  PAN Card *
                </Typography>
                <Button variant="outlined" component="label" fullWidth
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}>
                  {pancardFile ? pancardFile.name : 'Choose file...'}
                  <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange(setPancardFile)} />
                </Button>
              </Grid>

              {/* Tech Stacks */}
              <Grid item xs={12}>
                {techLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
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
                        <Chip label={option.name} {...getTagProps({ index })} key={option.id}
                          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }} />
                      ))
                    }
                    renderInput={params => (
                      <TextField {...params} label="Tech Stacks *"
                        placeholder="Search and select tech stacks..." />
                    )}
                  />
                )}
              </Grid>

              {/* Work Experience */}
              <Grid item xs={12}>
                <TextField label="Work Experience" fullWidth multiline rows={3} value={workExperience}
                  onChange={e => setWorkExperience(e.target.value)}
                  placeholder="Describe your work experience..." />
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <TextField label="First Job Date" type="date" fullWidth value={firstJobDate}
                  onChange={e => setFirstJobDate(e.target.value)}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Last Working Day" type="date" fullWidth value={lastWorkingDay}
                  onChange={e => setLastWorkingDay(e.target.value)}
                  InputLabelProps={{ shrink: true }} />
              </Grid>

              {/* Salary */}
              <Grid item xs={12}>
                <TextField label="Last Company Salary (₹)" type="number" fullWidth value={lastCompanySalary}
                  onChange={e => setLastCompanySalary(e.target.value)}
                  placeholder="e.g. 800000" />
              </Grid>

              {/* Submit */}
              <Grid item xs={12}>
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  sx={{
                    mt: 2, py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)' }
                  }}>
                  {loading ? 'Submitting...' : 'Submit & Continue'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CandidateRegister;
