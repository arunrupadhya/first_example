import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge
} from '@mui/material';
import {
  ArrowBack,
  Send as SendIcon,
  Chat as ChatIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import './Chat.css';

const Chat = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [stompClient, setStompClient] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const selectedUserRef = useRef(null);
  const currentUser = localStorage.getItem('username');
  const token = localStorage.getItem('token');

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Keep selectedUserRef in sync
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // Load users list
  const loadUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/messages/users', authHeader);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  }, []);

  // Load unread counts per user
  const loadUnreadCounts = useCallback(async () => {
    try {
      const partners = await axios.get('/api/messages/conversations', authHeader);
      const counts = {};
      for (const partner of partners.data) {
        try {
          const conv = await axios.get(`/api/messages/conversation/${partner}`, authHeader);
          const unread = conv.data.filter(m => m.senderUsername === partner && !m.read).length;
          if (unread > 0) counts[partner] = unread;
        } catch { /* ignore */ }
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to load unread counts', err);
    }
  }, []);

  // Load initial online users
  const loadOnlineUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/messages/online', authHeader);
      setOnlineUsers(new Set(res.data));
    } catch { /* ignore */ }
  }, []);

  // Load conversation with selected user
  const loadConversation = useCallback(async (username) => {
    try {
      const res = await axios.get(`/api/messages/conversation/${username}`, authHeader);
      setMessages(res.data);
      // Mark as read
      await axios.post(`/api/messages/read/${username}`, {}, authHeader);
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[username];
        return updated;
      });
    } catch (err) {
      console.error('Failed to load conversation', err);
    }
  }, []);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/user/queue/messages', (message) => {
          const msg = JSON.parse(message.body);
          const currentSelected = selectedUserRef.current;
          setMessages(prev => {
            if (
              (msg.senderUsername === currentSelected || msg.recipientUsername === currentSelected) &&
              (msg.senderUsername === currentUser || msg.recipientUsername === currentUser)
            ) {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            }
            return prev;
          });
          if (msg.senderUsername !== currentUser && msg.senderUsername !== currentSelected) {
            setUnreadCounts(prev => ({
              ...prev,
              [msg.senderUsername]: (prev[msg.senderUsername] || 0) + 1
            }));
          }
        });

        // Subscribe to online presence updates
        client.subscribe('/topic/online', (message) => {
          const onlineList = JSON.parse(message.body);
          setOnlineUsers(new Set(onlineList));
        });

        // Subscribe to typing indicator
        client.subscribe('/user/queue/typing', (message) => {
          const data = JSON.parse(message.body);
          if (data.typing) {
            setTypingUsers(prev => ({ ...prev, [data.username]: Date.now() }));
            // Auto-clear after 3 seconds
            setTimeout(() => {
              setTypingUsers(prev => {
                const updated = { ...prev };
                if (updated[data.username] && Date.now() - updated[data.username] >= 2900) {
                  delete updated[data.username];
                }
                return updated;
              });
            }, 3000);
          } else {
            setTypingUsers(prev => {
              const updated = { ...prev };
              delete updated[data.username];
              return updated;
            });
          }
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
      }
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client.active) client.deactivate();
    };
  }, [token, currentUser]);

  useEffect(() => {
    loadUsers();
    loadUnreadCounts();
    loadOnlineUsers();
  }, [loadUsers, loadUnreadCounts, loadOnlineUsers]);

  useEffect(() => {
    if (selectedUser) {
      loadConversation(selectedUser);
    }
  }, [selectedUser, loadConversation]);

  const sendTypingIndicator = useCallback((isTyping) => {
    if (stompClient && stompClient.active && selectedUser) {
      stompClient.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ recipientUsername: selectedUser, typing: isTyping })
      });
    }
  }, [stompClient, selectedUser]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    // Send typing indicator (throttle to once per second)
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1000) {
      sendTypingIndicator(true);
      lastTypingSentRef.current = now;
    }
    // Clear typing after 2s of no input
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    // Stop typing indicator
    sendTypingIndicator(false);
    clearTimeout(typingTimeoutRef.current);

    try {
      const res = await axios.post('/api/messages/send', {
        recipientUsername: selectedUser,
        content: newMessage.trim()
      }, authHeader);
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectUser = (username) => {
    setSelectedUser(username);
    setMessages([]);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredUsers = users.filter(u =>
    onlineUsers.has(u) && u.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div>
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Badge badgeContent={totalUnread} color="error" sx={{ mr: 2 }}>
            <ChatIcon />
          </Badge>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Messenger
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
            {currentUser}
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

      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>Chats</h3>
          </div>
          <div className="chat-search">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ul className="chat-user-list">
            {filteredUsers.map(username => (
              <li
                key={username}
                className={`chat-user-item ${selectedUser === username ? 'active' : ''}`}
                onClick={() => selectUser(username)}
              >
                <div className="chat-avatar-wrapper">
                  <div className="chat-user-avatar">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  {onlineUsers.has(username) && <span className="online-dot" />}
                </div>
                <div className="chat-user-info">
                  <div className="chat-user-name">{username}</div>
                  <div className={`chat-user-status ${onlineUsers.has(username) ? 'online' : ''}`}>
                    {typingUsers[username] ? 'typing...' : onlineUsers.has(username) ? 'Online' : 'Offline'}
                  </div>
                </div>
                {unreadCounts[username] > 0 && (
                  <div className="chat-user-unread">{unreadCounts[username]}</div>
                )}
              </li>
            ))}
            {filteredUsers.length === 0 && (
              <li style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                No users found
              </li>
            )}
          </ul>
        </div>

        {/* Main chat area */}
        <div className="chat-main">
          {selectedUser ? (
            <>
              <div className="chat-main-header">
                <div className="chat-avatar-wrapper">
                  <div className="chat-user-avatar">
                    {selectedUser.charAt(0).toUpperCase()}
                  </div>
                  {onlineUsers.has(selectedUser) && <span className="online-dot" />}
                </div>
                <div>
                  <h3>{selectedUser}</h3>
                  <div className={`chat-header-status ${onlineUsers.has(selectedUser) ? 'online' : ''}`}>
                    {typingUsers[selectedUser] ? 'typing...' : onlineUsers.has(selectedUser) ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message ${msg.senderUsername === currentUser ? 'sent' : 'received'}`}
                  >
                    <div>{msg.content}</div>
                    <div className="chat-message-time">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                ))}
                {typingUsers[selectedUser] && (
                  <div className="chat-typing-indicator">
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <span className="typing-text">{selectedUser} is typing</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                />
                <button
                  className="chat-send-btn"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <SendIcon fontSize="small" />
                </button>
              </div>
            </>
          ) : (
            <div className="chat-empty">
              <ChatIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <h3>Welcome to Messenger</h3>
              <p>Select a user from the sidebar to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
