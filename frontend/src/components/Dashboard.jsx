import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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
  Badge,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton
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
  Edit as EditIcon,
  Chat as ChatIcon
} from '@mui/icons-material';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, sender: '', content: '', key: 0 });
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('username');

  // Fetch initial unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await axios.get('/api/messages/unread', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.count || 0);
    } catch { /* ignore */ }
  }, [token]);

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
    loadUnreadCount();
  }, [token, loadUnreadCount]);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/user/queue/messages', (message) => {
          const msg = JSON.parse(message.body);
          if (msg.senderUsername !== currentUser) {
            setUnreadCount(prev => prev + 1);
            // Close existing snackbar first, then open new one
            setSnackbar(prev => ({ ...prev, open: false }));
            setTimeout(() => {
              setSnackbar({
                open: true,
                sender: msg.senderUsername,
                content: msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content,
                key: Date.now()
              });
            }, 100);
          }
        });
      }
    });

    client.activate();
    return () => { if (client.active) client.deactivate(); };
  }, [token, currentUser]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
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

      case 'profile':
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              User Profile
            </Typography>
            <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
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
              <Button
                variant="contained"
                endIcon={<EditIcon />}
                sx={{
                  mt: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none'
                }}
              >
                Edit Profile
              </Button>
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
            startIcon={
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <ChatIcon />
              </Badge>
            }
            onClick={() => navigate('/chat')}
            sx={{ textTransform: 'none', fontSize: 14, mr: 2 }}
          >
            Messenger
          </Button>
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
      {/* Message notification toast */}
      <Snackbar
        key={snackbar.key}
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity="info"
          variant="filled"
          icon={<ChatIcon />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setSnackbar(prev => ({ ...prev, open: false }));
                navigate('/chat');
              }}
            >
              Open
            </Button>
          }
          sx={{ width: '100%', cursor: 'pointer' }}
        >
          <strong>{snackbar.sender}</strong>: {snackbar.content}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;