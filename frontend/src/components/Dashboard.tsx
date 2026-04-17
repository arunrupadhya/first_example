import { useEffect, useState, useMemo, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CameraCapture from './CameraCapture';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  Divider,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  ExpandMore,
  Notifications,
  Security,
  Analytics,
  ContactSupport,
  People,
  Search as SearchIcon,
  CheckCircle,
  Cancel,
  Email as EmailIcon,
  AutoAwesomeRounded,
} from '@mui/icons-material';
import aiWorkspaceIllustration from '../assets/ai-workspace-illustration.svg';

interface TabItem {
  id: string;
  label: string;
  icon: ReactElement;
}

interface CandidateSummary {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  createdAt: string;
  hasPhoto: boolean;
  hasVideo: boolean;
  techStacks: string[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('username');
  const userRole = localStorage.getItem('role') || localStorage.getItem('userRole') || 'EMPLOYEE';
  const isHrOrPractice = userRole === 'HR' || userRole === 'PRACTICE';

  useEffect(() => {
    if (currentUser) {
      axios.get(`/api/photo/${currentUser}`)
        .then(res => { if (res.data.photoUrl) setPhotoUrl(res.data.photoUrl); })
        .catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    axios.get('/api/dashboard', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(response => {
      setMessage(response.data);
    }).catch((err) => {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('userRole');
        navigate('/login');
        return;
      }
      setMessage('Access denied');
    }).finally(() => {
      setLoading(false);
    });
  }, [token, navigate]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  useEffect(() => {
    if (isHrOrPractice && activeTab === 'candidates') {
      setCandidatesLoading(true);
      axios.get('/api/candidates', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => setCandidates(res.data))
        .catch(() => setCandidates([]))
        .finally(() => setCandidatesLoading(false));
    }
  }, [activeTab, isHrOrPractice, token]);

  const filteredCandidates = useMemo(() => candidates.filter(c => {
    const name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || c.email.toLowerCase().includes(q);
  }), [candidates, searchQuery]);

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
    ...(isHrOrPractice ? [{ id: 'candidates', label: 'Candidates', icon: <People /> }] : []),
    ...(isHrOrPractice ? [{ id: 'send-email', label: 'Send Email', icon: <EmailIcon /> }] : []),
    { id: 'profile', label: 'Profile', icon: <Person /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    { id: 'help', label: 'Help', icon: <HelpIcon /> },
  ];

  const overviewCards = [
    {
      label: 'Access Level',
      value: userRole,
      helper: 'Current workspace role',
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    },
    {
      label: 'Candidate Queue',
      value: isHrOrPractice ? String(candidates.length || 0).padStart(2, '0') : '—',
      helper: 'Visible applications',
      background: 'linear-gradient(135deg, #0F9D8A 0%, #14B8A6 100%)',
    },
    {
      label: 'System Status',
      value: 'Online',
      helper: 'Platform is operational',
      background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
    },
    {
      label: 'Session',
      value: token ? 'Secure' : 'Guest',
      helper: 'Authentication state',
      background: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress aria-label="Loading dashboard" />
              </Box>
            ) : (
              <>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 3, md: 4 },
                    mb: 3,
                    borderRadius: 4,
                    overflow: 'hidden',
                    color: '#fff',
                    background: 'linear-gradient(135deg, #0F172A 0%, #4338CA 55%, #0F9D8A 100%)',
                  }}
                >
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={7}>
                      <Chip
                        icon={<AutoAwesomeRounded sx={{ color: '#fff !important' }} />}
                        label={`${userRole} workspace`}
                        sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff' }}
                      />
                      <Typography variant="h4" sx={{ mb: 1.25 }}>
                        Hiring operations, beautifully streamlined.
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.86)', mb: 2.5 }}>
                        {message || 'Welcome to your dashboard.'}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Chip label="Candidate onboarding" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                        <Chip label="Identity checks" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                        <Chip label="Assessment review" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <Box
                        component="img"
                        src={aiWorkspaceIllustration}
                        alt="Abstract illustration of a modern hiring dashboard"
                        sx={{ width: '100%', maxWidth: 360, display: 'block', ml: { md: 'auto' } }}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Grid container spacing={3}>
                  {overviewCards.map((card) => (
                    <Grid item xs={12} sm={6} md={3} key={card.label}>
                      <Card sx={{ background: card.background, color: '#fff' }}>
                        <CardContent>
                          <Typography sx={{ fontSize: 13, opacity: 0.88, mb: 1 }}>
                            {card.label}
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                            {card.value}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.82)' }}>
                            {card.helper}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        );

      case 'candidates':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 0.75, fontWeight: 700 }}>
              Candidate Applications
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Review submitted profiles, uploaded media, and skill coverage at a glance.
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{ mb: 3 }}
              inputProps={{ 'aria-label': 'Search candidates by name or email' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon aria-hidden="true" sx={{ color: '#94A3B8' }} />
                  </InputAdornment>
                ),
              }}
            />
            {candidatesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress aria-label="Loading candidates" />
              </Box>
            ) : filteredCandidates.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: 3 }}>
                <Typography variant="body1" sx={{ color: '#64748B' }}>
                  {searchQuery ? 'No candidates match your search.' : 'No candidate applications yet.'}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(15,23,42,0.06)' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tech Stacks</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Photo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Video</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Applied On</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCandidates.map((c, idx) => (
                      <TableRow
                        key={c.id}
                        hover
                        tabIndex={0}
                        role="link"
                        aria-label={`View profile of ${[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ')}`}
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(79, 70, 229, 0.04)' } }}
                        onClick={() => navigate(`/candidate-profile/${c.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/candidate-profile/${c.id}`);
                          }
                        }}
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#4F46E5' }}>
                            {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>{c.email}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {c.techStacks.slice(0, 3).map(ts => (
                              <Chip key={ts} label={ts} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                            ))}
                            {c.techStacks.length > 3 && (
                              <Chip label={`+${c.techStacks.length - 3}`} size="small" sx={{ fontSize: 11, height: 22 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {c.hasPhoto ? <CheckCircle aria-label="Photo uploaded" sx={{ color: '#16A34A', fontSize: 20 }} /> : <Cancel aria-label="No photo" sx={{ color: '#CBD5E1', fontSize: 20 }} />}
                        </TableCell>
                        <TableCell align="center">
                          {c.hasVideo ? <CheckCircle aria-label="Video uploaded" sx={{ color: '#16A34A', fontSize: 20 }} /> : <Cancel aria-label="No video" sx={{ color: '#CBD5E1', fontSize: 20 }} />}
                        </TableCell>
                        <TableCell>
                          {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 'profile':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
              User Profile
            </Typography>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: '#F8FAFC', borderRadius: 3 }}>
              <Box sx={{ mb: 3, p: 3, backgroundColor: '#fff', borderRadius: 3, textAlign: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
                  Profile Photo
                </Typography>
                <CameraCapture
                  token={token}
                  username={currentUser}
                  photoUrl={photoUrl}
                  onPhotoUpdated={setPhotoUrl}
                />
              </Box>
              <List disablePadding>
                <ListItem sx={{ py: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      Username
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                      {localStorage.getItem('username') || 'User'}
                    </Typography>
                  </Box>
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem sx={{ py: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      Email
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                      user@example.com
                    </Typography>
                  </Box>
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem sx={{ py: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      Member Since
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                      January 2026
                    </Typography>
                  </Box>
                </ListItem>
              </List>
            </Paper>
          </Box>
        );

      case 'settings':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
              Settings
            </Typography>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: '#F8FAFC', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Notifications aria-hidden="true" sx={{ color: '#4F46E5' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Enable Notifications
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        Receive important updates and alerts
                      </Typography>
                    </Box>
                  </Box>
                  <Switch defaultChecked inputProps={{ 'aria-label': 'Enable notifications' }} />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <DashboardIcon aria-hidden="true" sx={{ color: '#4F46E5' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Focus Mode
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        Reduce distractions on the dashboard
                      </Typography>
                    </Box>
                  </Box>
                  <Switch inputProps={{ 'aria-label': 'Toggle focus mode' }} />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Security aria-hidden="true" sx={{ color: '#4F46E5' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Two-Factor Authentication
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        Secure your account with 2FA
                      </Typography>
                    </Box>
                  </Box>
                  <Switch inputProps={{ 'aria-label': 'Enable two-factor authentication' }} />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Analytics aria-hidden="true" sx={{ color: '#4F46E5' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Share Analytics
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        Help improve the experience with usage signals
                      </Typography>
                    </Box>
                  </Box>
                  <Switch defaultChecked inputProps={{ 'aria-label': 'Share analytics data' }} />
                </Box>
              </Box>
              <Button variant="contained" sx={{ mt: 3, background: '#16A34A', '&:hover': { background: '#15803D' } }}>
                Save Changes
              </Button>
            </Paper>
          </Box>
        );

      case 'help':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
              Help & Support
            </Typography>
            <Box>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <HelpIcon aria-hidden="true" sx={{ mr: 2, color: '#4F46E5' }} />
                  <Typography sx={{ fontWeight: 700 }}>How do I reset my password?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Go to Settings and click the password update option to reset your account securely.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Security aria-hidden="true" sx={{ mr: 2, color: '#4F46E5' }} />
                  <Typography sx={{ fontWeight: 700 }}>How do I enable two-factor authentication?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Navigate to Settings and toggle the two-factor authentication option.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Person aria-hidden="true" sx={{ mr: 2, color: '#4F46E5' }} />
                  <Typography sx={{ fontWeight: 700 }}>Where can I find my account details?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Your account information is available from the Profile tab.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <ContactSupport aria-hidden="true" sx={{ mr: 2, color: '#4F46E5' }} />
                  <Typography sx={{ fontWeight: 700 }}>How do I contact support?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Email the support team at support@example.com for assistance.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>

            <Button variant="contained" startIcon={<ContactSupport />} sx={{ mt: 3, background: '#0EA5E9', '&:hover': { background: '#0284C7' } }}>
              Contact Support
            </Button>
          </Box>
        );

      case 'send-email':
        navigate('/send-email');
        return null;

      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F4F7FB 0%, #EDF4FF 100%)' }}>
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
          <DashboardIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Dashboard
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip label={userRole} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }} />
            <Button color="inherit" endIcon={<LogoutIcon />} onClick={logout} sx={{ fontSize: 14 }}>
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 4,
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
              }}
              component="nav"
              aria-label="Dashboard navigation"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, pb: 2 }}>
                <Avatar src={photoUrl || undefined} sx={{ bgcolor: '#4F46E5' }}>
                  {currentUser?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{currentUser || 'User'}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>{userRole}</Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                {tabs.map((tab, index) => (
                  <Box key={tab.id}>
                    <ListItemButton
                      selected={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      sx={{
                        my: 0.5,
                        borderRadius: 2.5,
                        py: 1.4,
                        px: 1.5,
                        background: activeTab === tab.id ? 'linear-gradient(90deg, rgba(79,70,229,0.10) 0%, rgba(15,157,138,0.04) 100%)' : 'transparent',
                        '&:hover': {
                          background: 'rgba(79,70,229,0.06)',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 38, color: activeTab === tab.id ? '#4F46E5' : '#475569' }}>
                        {tab.icon}
                      </ListItemIcon>
                      <Typography sx={{ fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? '#4F46E5' : '#334155' }}>
                        {tab.label}
                      </Typography>
                    </ListItemButton>
                    {index < tabs.length - 1 && <Divider sx={{ opacity: 0.35 }} />}
                  </Box>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={9}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }} component="main" role="main">
              {renderTabContent()}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
