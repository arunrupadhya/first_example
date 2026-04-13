import { useEffect, useState, useCallback, ReactElement } from 'react';
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
  InputAdornment
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
  Cancel
} from '@mui/icons-material';

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
  const userRole = localStorage.getItem('role') || 'EMPLOYEE';
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
        Authorization: `Bearer ${token}`
      }
    }).then(response => {
      setMessage(response.data);
    }).catch((err) => {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
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
    window.location.href = '/login';
  };

  useEffect(() => {
    if (isHrOrPractice && activeTab === 'candidates') {
      setCandidatesLoading(true);
      axios.get('/api/candidates', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setCandidates(res.data))
        .catch(() => setCandidates([]))
        .finally(() => setCandidatesLoading(false));
    }
  }, [activeTab, isHrOrPractice, token]);

  const filteredCandidates = candidates.filter(c => {
    const name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || c.email.toLowerCase().includes(q);
  });

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
    ...(isHrOrPractice ? [{ id: 'candidates', label: 'Candidates', icon: <People /> }] : []),
    { id: 'profile', label: 'Profile', icon: <Person /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    { id: 'help', label: 'Help', icon: <HelpIcon /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              Dashboard Overview
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography variant="body1" sx={{ mb: 3, color: '#555' }}>
                  {message || 'Welcome to your dashboard!'}
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography color="inherit" sx={{ fontSize: 14, mb: 1 }}>
                          Total Users
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          1,234
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography color="inherit" sx={{ fontSize: 14, mb: 1 }}>
                          Active Sessions
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          456
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography color="inherit" sx={{ fontSize: 14, mb: 1 }}>
                          System Status
                        </Typography>
                        <Chip label="✓ Online" variant="filled" sx={{ background: 'rgba(255,255,255,0.3)', color: 'white' }} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography color="inherit" sx={{ fontSize: 14, mb: 1 }}>
                          Last Update
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Just Now
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        );

      case 'candidates':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              Candidate Applications
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#999' }} />
                  </InputAdornment>
                )
              }}
            />
            {candidatesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredCandidates.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', backgroundColor: '#f8f9fa' }}>
                <Typography variant="body1" sx={{ color: '#999' }}>
                  {searchQuery ? 'No candidates match your search.' : 'No candidate applications yet.'}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
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
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.04)' } }}
                        onClick={() => navigate(`/candidate-profile/${c.id}`)}
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                            {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>{c.email}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {c.techStacks.slice(0, 3).map(ts => (
                              <Chip key={ts} label={ts} size="small" variant="outlined"
                                sx={{ fontSize: 11, height: 22 }} />
                            ))}
                            {c.techStacks.length > 3 && (
                              <Chip label={`+${c.techStacks.length - 3}`} size="small"
                                sx={{ fontSize: 11, height: 22 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {c.hasPhoto ? <CheckCircle sx={{ color: '#27ae60', fontSize: 20 }} /> : <Cancel sx={{ color: '#ccc', fontSize: 20 }} />}
                        </TableCell>
                        <TableCell align="center">
                          {c.hasVideo ? <CheckCircle sx={{ color: '#27ae60', fontSize: 20 }} /> : <Cancel sx={{ color: '#ccc', fontSize: 20 }} />}
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
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              User Profile
            </Typography>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
              {/* Photo Section */}
              <Box sx={{ mb: 3, p: 3, backgroundColor: '#fff', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2c3e50', mb: 2 }}>
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
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                      Username
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#555', mt: 0.5 }}>
                      {localStorage.getItem('username') || 'User'}
                    </Typography>
                  </Box>
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem sx={{ py: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                      Email
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#555', mt: 0.5 }}>
                      user@example.com
                    </Typography>
                  </Box>
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem sx={{ py: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                      Member Since
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#555', mt: 0.5 }}>
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
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              Settings
            </Typography>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Notifications sx={{ color: '#667eea' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Enable Notifications
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        Receive important updates and alerts
                      </Typography>
                    </Box>
                  </Box>
                  <Switch defaultChecked />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <DashboardIcon sx={{ color: '#667eea' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Dark Mode
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        Toggle dark theme
                      </Typography>
                    </Box>
                  </Box>
                  <Switch />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Security sx={{ color: '#667eea' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Two-Factor Authentication
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        Secure your account with 2FA
                      </Typography>
                    </Box>
                  </Box>
                  <Switch />
                </Box>
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Analytics sx={{ color: '#667eea' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Share Analytics
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                        Help us improve by sharing usage data
                      </Typography>
                    </Box>
                  </Box>
                  <Switch defaultChecked />
                </Box>
              </Box>
              <Button
                variant="contained"
                sx={{
                  mt: 3,
                  background: '#27ae60',
                  textTransform: 'none',
                  '&:hover': { background: '#229954' }
                }}
              >
                Save Changes
              </Button>
            </Paper>
          </Box>
        );

      case 'help':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              Help & Support
            </Typography>
            <Box>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <HelpIcon sx={{ mr: 2, color: '#667eea' }} />
                  <Typography sx={{ fontWeight: 600 }}>How do I reset my password?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Go to Settings and click "Change Password" to reset your account password securely.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Security sx={{ mr: 2, color: '#667eea' }} />
                  <Typography sx={{ fontWeight: 600 }}>How do I enable two-factor authentication?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Navigate to Settings and toggle the "Two-Factor Authentication" option to enable it.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Person sx={{ mr: 2, color: '#667eea' }} />
                  <Typography sx={{ fontWeight: 600 }}>Where can I find my account details?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    All your account information is accessible from the Profile tab.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <ContactSupport sx={{ mr: 2, color: '#667eea' }} />
                  <Typography sx={{ fontWeight: 600 }}>How do I contact support?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Email our support team at support@example.com for assistance.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>

            <Button
              variant="contained"
              startIcon={<ContactSupport />}
              sx={{
                mt: 3,
                background: '#3498db',
                textTransform: 'none',
                '&:hover': { background: '#2980b9' }
              }}
            >
              Contact Support
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Dashboard
          </Typography>
          <Button
            color="inherit"
            endIcon={<LogoutIcon />}
            onClick={logout}
            sx={{ textTransform: 'none', fontSize: 14 }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Sidebar Navigation */}
          <Grid item xs={12} md={3}>
            <Paper elevation={0} sx={{ p: 0, backgroundColor: '#fff' }}>
              <List disablePadding>
                {tabs.map((tab, index) => (
                  <Box key={tab.id}>
                    <ListItemButton
                      selected={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      sx={{
                        py: 2,
                        px: 2,
                        borderLeft: activeTab === tab.id ? '4px solid #667eea' : '4px solid transparent',
                        background: activeTab === tab.id ? 'linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%)' : 'transparent',
                        '&:hover': {
                          background: 'rgba(102, 126, 234, 0.05)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: activeTab === tab.id ? '#667eea' : '#555' }}>
                        {tab.icon}
                      </ListItemIcon>
                      <Typography
                        sx={{
                          fontWeight: activeTab === tab.id ? 600 : 500,
                          color: activeTab === tab.id ? '#667eea' : '#555'
                        }}
                      >
                        {tab.label}
                      </Typography>
                    </ListItemButton>
                    {index < tabs.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: '#fff' }}>
              {renderTabContent()}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
