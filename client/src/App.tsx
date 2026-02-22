import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

console.log('🔗 Frontend API URL:', API_URL);

interface User {
  _id: string;
  username: string;
  email?: string;
}

interface Chat {
  _id: string;
  participants: string[];
  status: 'pending' | 'accepted' | 'rejected';
  initiatedBy: string;
  createdAt: string;
  acceptedAt?: string;
  otherParticipant?: { _id: string; username: string };
}

interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// ── Visual Viewport hook ──────────────────────────────────────────────────
// iOS Safari does NOT shrink the CSS viewport when the virtual keyboard opens.
// We use the VisualViewport API to track the real visible area and write it
// as --visual-vh on :root. The CSS container uses this custom property so the
// layout always fits exactly in the visible screen area above the keyboard.
function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const visibleHeight = vv.height;
      document.documentElement.style.setProperty('--visual-vh', `${visibleHeight}px`);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}

// Simple hook: returns true when window width ≤ 600px
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function App() {
  useVisualViewport();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  // Desktop: whether sidebar column is visible
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Mobile: whether the overlay drawer is open
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  // On mobile: show sidebar when no chat selected, hide when chat selected
  useEffect(() => {
    if (isMobile) {
      setMobileSidebarOpen(!selectedChat);
    }
  }, [selectedChat, isMobile]);

  // Initialize socket
  useEffect(() => {
    if (currentUser) {
      const newSocket = io(API_URL, { transports: ['websocket'] });

      newSocket.on('connect', () => {
        setConnectionStatus('connected');
        newSocket.emit('USER_CONNECT', { userId: currentUser._id });
      });
      newSocket.on('disconnect', () => setConnectionStatus('disconnected'));
      newSocket.on('connect_error', () => {
        setConnectionStatus('disconnected');
        setError(`Failed to connect to server at ${API_URL}`);
      });
      newSocket.on('MESSAGE_RECEIVED', (data) => {
        if (data.chatId === selectedChat?._id) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === data.message._id)) return prev;
            return [...prev, data.message];
          });
        }
        loadChats();
      });
      newSocket.on('CHAT_REQUEST', () => loadChats());
      newSocket.on('CHAT_ACCEPTED', (data) => {
        loadChats();
        if (data.chat._id === selectedChat?._id) setSelectedChat(data.chat);
      });
      newSocket.on('ERROR', (data) => setError(data.error));

      setSocket(newSocket);
      return () => { newSocket.disconnect(); };
    }
  }, [currentUser, selectedChat]);

  // Test backend
  useEffect(() => {
    axios.get(`${API_URL}/health`).catch(() =>
      setError(`Cannot connect to backend at ${API_URL}. Make sure the server is running.`)
    );
  }, []);

  const loadChats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(`${API_URL}/api/chat/user/${currentUser._id}`);
      setChats(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load chats');
    }
  }, [currentUser]);

  const loadMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const res = await axios.get(`${API_URL}/api/chat/${selectedChat._id}/messages?limit=100`);
      setMessages(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load messages');
    }
  }, [selectedChat]);

  useEffect(() => { if (currentUser) loadChats(); }, [currentUser]);
  useEffect(() => { if (selectedChat) loadMessages(); else setMessages([]); }, [selectedChat]);

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/users/enter`, { username: newUsername.trim() });
      setCurrentUser(res.data);
      setNewUsername('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to enter');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUserId) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/chat/request`, {
        fromUserId: currentUser._id,
        toUserId: selectedUserId,
      });
      setShowChatModal(false);
      setSelectedUserId('');
      loadChats();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChat = async (chat: Chat) => {
    if (!currentUser) return;
    try {
      await axios.post(`${API_URL}/api/chat/${chat._id}/accept`, { userId: currentUser._id });
      loadChats();
      if (chat._id === selectedChat?._id) setSelectedChat({ ...chat, status: 'accepted' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept chat');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat || !currentUser || !socket) return;
    if (selectedChat.status !== 'accepted') {
      setError('Chat must be accepted before sending messages');
      return;
    }
    const content = messageInput.trim();
    setMessageInput('');
    try {
      socket.emit('MESSAGE_SEND', { chatId: selectedChat._id, content, senderId: currentUser._id });
    } catch {
      setMessageInput(content);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
    setConnectionStatus('disconnected');
    if (socket) { socket.disconnect(); setSocket(null); }
  };

  const getOtherParticipant = (chat: Chat) => {
    if (!currentUser) return 'Unknown';
    return chat.participants.find((id) => id !== currentUser._id) || 'Unknown';
  };

  const getChatName = (chat: Chat) =>
    chat.otherParticipant?.username ?? getOtherParticipant(chat);

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getDateKey = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDateLabel = (d: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tk = getDateKey(today.toISOString());
    const yk = getDateKey(yesterday.toISOString());
    const k = getDateKey(d);
    if (k === tk) return 'Today';
    if (k === yk) return 'Yesterday';
    return new Date(d).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="modal">
        <div className="modal-content">
          <h2>💬 Chat App</h2>
          <p className="modal-hint">Enter your username to start chatting.</p>
          <form onSubmit={handleEnter}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                placeholder="Enter your username"
                autoFocus
              />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Entering…' : 'Enter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Sidebar class ─────────────────────────────────────────────────────────
  const sidebarClass = [
    'sidebar',
    isMobile
      ? mobileSidebarOpen ? 'sidebar--mobile-open' : 'sidebar--collapsed'
      : sidebarOpen ? '' : 'sidebar--collapsed',
  ].filter(Boolean).join(' ');

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="container">
      {/* ── Header ── */}
      <div className="header">
        <div className="header-left">
          {/* Hamburger: mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileSidebarOpen(true)}
            title="Open menu"
            aria-label="Open sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect y="3" width="18" height="2" rx="1" fill="#8B93A7" />
              <rect y="8" width="18" height="2" rx="1" fill="#8B93A7" />
              <rect y="13" width="18" height="2" rx="1" fill="#8B93A7" />
            </svg>
          </button>
          <h1>💬 Chat</h1>
        </div>

        <div className="header-right">
          <span className="user-badge" title={`Your ID: ${currentUser._id}`}>
            {currentUser.username}
          </span>
          {/* Copy ID — hidden on mobile via CSS */}
          <button
            className="copy-id-btn"
            onClick={() => {
              navigator.clipboard.writeText(currentUser._id);
              setSuccess('User ID copied!');
              setTimeout(() => setSuccess(''), 2000);
            }}
            title="Click to copy your User ID"
          >
            ID: {currentUser._id.substring(0, 6)}…
          </button>
          {/* Status dot */}
          <span
            className={`status-dot ${connectionStatus === 'connected' ? 'connected' : 'disconnected'}`}
            title={connectionStatus}
          />
          {!isMobile && (
            <button
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="main-content">

        {/* Mobile overlay backdrop */}
        <div
          className={`sidebar-overlay${isMobile && mobileSidebarOpen ? ' visible' : ''}`}
          onClick={() => setMobileSidebarOpen(false)}
        />

        {/* Sidebar */}
        <div className={sidebarClass}>
          <div className="sidebar-header">
            <button onClick={() => setShowChatModal(true)} className="new-chat-btn">
              + New Chat
            </button>
            <button
              className="sidebar-toggle-btn"
              onClick={() => isMobile ? setMobileSidebarOpen(false) : setSidebarOpen(false)}
              title="Close sidebar"
            >
              &#8249;
            </button>
          </div>
          <div className="chat-list">
            {chats.length === 0 ? (
              <div className="loading">No chats yet. Start a new chat!</div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat._id}
                  className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedChat(chat);
                    if (isMobile) setMobileSidebarOpen(false);
                  }}
                >
                  <div className="chat-item-header">
                    <span className="chat-item-name">{getChatName(chat)}</span>
                    <span className={`chat-item-status status-${chat.status}`}>
                      {chat.status}
                    </span>
                  </div>
                  {chat.status === 'pending' && chat.initiatedBy !== currentUser._id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAcceptChat(chat); }}
                      className="btn btn-primary"
                      style={{ marginTop: '8px', padding: '6px 12px', fontSize: '12px' }}
                    >
                      Accept
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-user-info">
              <span className="sidebar-username">{currentUser.username}</span>
              <button
                className="sidebar-id-badge"
                onClick={() => {
                  navigator.clipboard.writeText(currentUser._id);
                  setSuccess('User ID copied!');
                  setTimeout(() => setSuccess(''), 2000);
                }}
                title="Click to copy your User ID"
              >
                ID: {currentUser._id}
              </button>
            </div>
            {isMobile && (
              <button className="btn btn-secondary sidebar-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="chat-area">
          {/* Desktop: re-open floater */}
          {!isMobile && !sidebarOpen && (
            <button
              className="sidebar-open-btn"
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
            >
              &#8250;
            </button>
          )}

          {/* Mobile: top bar with back button + chat name */}
          {isMobile && selectedChat && (
            <div className="chat-area-topbar">
              <button
                className="back-btn"
                onClick={() => { setMobileSidebarOpen(true); setSelectedChat(null); }}
                aria-label="Back"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8L10 13" stroke="#8B93A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="chat-area-topbar-name">{getChatName(selectedChat)}</span>
            </div>
          )}

          {!selectedChat ? (
            <div className="empty-chat">
              {isMobile ? 'Tap + New Chat to start' : 'Select a chat to start messaging'}
            </div>
          ) : selectedChat.status !== 'accepted' ? (
            <div className="empty-chat">
              {selectedChat.initiatedBy === currentUser._id
                ? 'Waiting for the other person to accept…'
                : 'Tap Accept in the sidebar to start chatting'}
            </div>
          ) : (
            <>
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="loading">No messages yet. Say hello!</div>
                ) : (
                  messages.map((message, index) => {
                    const prevKey = index > 0 ? getDateKey(messages[index - 1].createdAt) : null;
                    const currKey = getDateKey(message.createdAt);
                    const showDate = prevKey !== currKey;
                    return (
                      <div key={message._id} className="message-row">
                        {showDate && (
                          <div className="date-separator">{formatDateLabel(message.createdAt)}</div>
                        )}
                        <div className={`message ${String(message.senderId) === String(currentUser._id) ? 'own' : 'other'}`}>
                          <div className="message-bubble">{message.content}</div>
                          <div className="message-time">{formatTime(message.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form className="input-area" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message…"
                />
                <button type="submit" disabled={!messageInput.trim()}>Send</button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── New Chat Modal ── */}
      {showChatModal && (
        <div className="modal" onClick={() => setShowChatModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Start New Chat</h2>
            <form onSubmit={handleCreateChat}>
              <div className="form-group">
                <label>User ID</label>
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  placeholder="Paste user ID here"
                  autoFocus
                />
                <small>💡 Share your ID (tap the ID badge in the header) and ask them to paste it here.</small>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowChatModal(false); setSelectedUserId(''); setError(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating…' : 'Create Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast notifications ── */}
      {error && (
        <div
          className="toast-notification"
          style={{
            position: 'fixed', bottom: 20, right: 20,
            background: '#1A1F2B', color: '#F87171',
            padding: '12px 18px', borderRadius: 8,
            border: '1px solid #222633', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            cursor: 'pointer', zIndex: 3000, fontSize: 14,
            maxWidth: 320,
          }}
          onClick={() => setError('')}
        >
          {error} <span style={{ opacity: 0.6 }}>(tap to dismiss)</span>
        </div>
      )}
      {success && (
        <div
          className="toast-notification"
          style={{
            position: 'fixed', bottom: 20, right: 20,
            background: '#1A1F2B', color: '#34D399',
            padding: '12px 18px', borderRadius: 8,
            border: '1px solid #222633', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            cursor: 'pointer', zIndex: 3000, fontSize: 14,
          }}
          onClick={() => setSuccess('')}
        >
          {success}
        </div>
      )}
    </div>
  );
}

export default App;
