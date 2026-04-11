import { useEffect, useState, useRef, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Badge } from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';
import './ChatWidget.css';

interface ChatWidgetProps {
  token: string | null;
  currentUser: string | null;
  onUnreadChange?: (count: number) => void;
}

interface Message {
  id: number;
  senderUsername: string;
  recipientUsername: string;
  content: string;
  timestamp: string;
  read: boolean;
}

const ChatWidget = ({ token, currentUser, onUnreadChange }: ChatWidgetProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const selectedUserRef = useRef<string | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${tokenRef.current}` } });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    onUnreadChange?.(total);
  }, [unreadCounts, onUnreadChange]);

  const loadUsers = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await axios.get<string[]>('/api/messages/users', getAuthHeader());
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  }, []);

  const loadUnreadCounts = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const partners = await axios.get<string[]>('/api/messages/conversations', getAuthHeader());
      const counts: Record<string, number> = {};
      for (const partner of partners.data) {
        try {
          const conv = await axios.get<Message[]>(`/api/messages/conversation/${partner}`, getAuthHeader());
          const unread = conv.data.filter(m => m.senderUsername === partner && !m.read).length;
          if (unread > 0) counts[partner] = unread;
        } catch { /* ignore */ }
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to load unread counts', err);
    }
  }, []);

  const loadOnlineUsers = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await axios.get<string[]>('/api/messages/online', getAuthHeader());
      setOnlineUsers(new Set(res.data));
    } catch { /* ignore */ }
  }, []);

  const loadConversation = useCallback(async (username: string) => {
    try {
      const res = await axios.get<Message[]>(`/api/messages/conversation/${username}`, getAuthHeader());
      setMessages(res.data);
      await axios.post(`/api/messages/read/${username}`, {}, getAuthHeader());
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[username];
        return updated;
      });
    } catch (err) {
      console.error('Failed to load conversation', err);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/user/queue/messages', (message) => {
          const msg: Message = JSON.parse(message.body);
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

        client.subscribe('/topic/online', (message) => {
          const onlineList: string[] = JSON.parse(message.body);
          setOnlineUsers(new Set(onlineList));
        });

        client.subscribe('/user/queue/typing', (message) => {
          const data: { username: string; typing: boolean } = JSON.parse(message.body);
          if (data.typing) {
            setTypingUsers(prev => ({ ...prev, [data.username]: Date.now() }));
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

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (stompClient && stompClient.active && selectedUser) {
      stompClient.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ recipientUsername: selectedUser, typing: isTyping })
      });
    }
  }, [stompClient, selectedUser]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1000) {
      sendTypingIndicator(true);
      lastTypingSentRef.current = now;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    sendTypingIndicator(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const res = await axios.post<Message>('/api/messages/send', {
        recipientUsername: selectedUser,
        content: newMessage.trim()
      }, getAuthHeader());
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectUser = (username: string) => {
    setSelectedUser(username);
    setMessages([]);
    setDrawerOpen(false);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setSelectedUser(null);
    setMessages([]);
    setNewMessage('');
  };

  const handleFabClick = () => {
    if (chatOpen) {
      closeChat();
      setDrawerOpen(true);
    } else {
      setDrawerOpen(!drawerOpen);
    }
  };

  const formatTime = (timestamp: string) => {
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

  return (
    <>
      {/* FAB — always visible when no chat window */}
      {!chatOpen && (
        <button className="cw-fab" onClick={handleFabClick}>
          <Badge badgeContent={totalUnread} color="error" overlap="circular">
            <ChatIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Badge>
        </button>
      )}

      {/* Overlay when drawer is open */}
      {drawerOpen && <div className="cw-overlay" onClick={() => setDrawerOpen(false)} />}

      {/* Right-side drawer with online users */}
      <div className={`cw-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="cw-drawer-header">
          <ChatIcon sx={{ fontSize: 20, mr: 1 }} />
          <span>Online Users</span>
          <button className="cw-drawer-close" onClick={() => setDrawerOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
        <div className="cw-search">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <ul className="cw-user-list">
          {filteredUsers.map(username => (
            <li
              key={username}
              className="cw-user-item"
              onClick={() => selectUser(username)}
            >
              <div className="cw-avatar-wrapper">
                <div className="cw-avatar">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="cw-online-dot" />
              </div>
              <div className="cw-user-info">
                <div className="cw-user-name">{username}</div>
                <div className="cw-user-status online">
                  {typingUsers[username] ? 'typing...' : 'Online'}
                </div>
              </div>
              {unreadCounts[username] > 0 && (
                <div className="cw-unread">{unreadCounts[username]}</div>
              )}
            </li>
          ))}
          {filteredUsers.length === 0 && (
            <li className="cw-empty-list">No online users found</li>
          )}
        </ul>
      </div>

      {/* Small chat window — bottom right */}
      {chatOpen && selectedUser && (
        <div className="cw-chat-window">
          <div className="cw-header">
            <div className="cw-header-title">
              <div className="cw-avatar" style={{ width: 30, height: 30, fontSize: 12, marginRight: 8 }}>
                {selectedUser.charAt(0).toUpperCase()}
              </div>
              <span className="cw-header-name">{selectedUser}</span>
              <span className={`cw-header-status ${onlineUsers.has(selectedUser) ? 'online' : ''}`}>
                {typingUsers[selectedUser] ? 'typing...' : onlineUsers.has(selectedUser) ? 'Online' : 'Offline'}
              </span>
            </div>
            <button className="cw-header-btn" onClick={closeChat}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </button>
          </div>

          <div className="cw-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`cw-message ${msg.senderUsername === currentUser ? 'sent' : 'received'}`}
              >
                <div>{msg.content}</div>
                <div className="cw-message-time">{formatTime(msg.timestamp)}</div>
              </div>
            ))}
            {typingUsers[selectedUser] && (
              <div className="cw-typing">
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="typing-text">{selectedUser} is typing</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="cw-input-area">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
            />
            <button
              className="cw-send-btn"
              onClick={sendMessage}
              disabled={!newMessage.trim()}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
