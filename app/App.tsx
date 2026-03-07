import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

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

interface ReplyTo {
  _id: string;
  content: string;
  senderId: string;
  senderName?: string;
}

interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  content: string;
  replyTo?: ReplyTo;
  createdAt: string;
}

// IMPORTANT: point this to the same backend as your web client.
// In dev, from a device/emulator you usually need your LAN IP, e.g.:
// const API_URL = 'http://192.168.1.10:3000';
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

console.log('🔗 Mobile API URL:', API_URL);

const theme = {
  bgPage: '#0F1117',
  bgPrimary: '#0D0F14',
  bgSecondary: '#151823',
  bgTertiary: '#1A1F2B',
  bgHover: '#222633',
  textPrimary: '#E6EAF2',
  textSecondary: '#8B93A7',
  accent: '#6366F1',
  accentSoft: 'rgba(99, 102, 241, 0.18)',
  bubbleSent: 'rgba(99, 102, 241, 0.22)',
  bubbleSentBorder: 'rgba(99, 102, 241, 0.35)',
  bubbleReceived: '#1A1F2B',
  border: '#222633',
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.12)',
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',
};

function getDateKey(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(d: string) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tk = getDateKey(today.toISOString());
  const yk = getDateKey(yesterday.toISOString());
  const k = getDateKey(d);
  if (k === tk) return 'Today';
  if (k === yk) return 'Yesterday';
  return new Date(d).toLocaleDateString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Linkify helper for React Native: splits text into segments and makes URLs tappable.
function linkify(
  text: string,
  keyPrefix: string,
): Array<React.ReactNode> {
  if (!text || typeof text !== 'string') return [text];

  const urlPattern =
    /(https?:\/\/[^\s<>"]+)|(www\.[^\s<>"]+)|(youtu\.be\/[^\s<>"]+)/gi;

  const parts: Array<React.ReactNode> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(urlPattern.source, urlPattern.flags);

  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(
        <Text key={`${keyPrefix}-text-${lastIndex}`}>
          {text.slice(lastIndex, m.index)}
        </Text>,
      );
    }
    let href = m[0];
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }
    const display = m[0];
    parts.push(
      <Text
        key={`${keyPrefix}-link-${m.index}`}
        style={styles.link}
        onPress={() => {
          Linking.openURL(href).catch(() => {});
        }}
      >
        {display}
      </Text>,
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`${keyPrefix}-text-${lastIndex}`}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return parts.length ? parts : [text];
}

// Configure how notifications are handled when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const messagesListRef = useRef<FlatList<any> | null>(null);

  // Toast helpers
  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => {
      setSuccess((prev) => (prev === msg ? '' : prev));
    }, 3000);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => {
      setError((prev) => (prev === msg ? '' : prev));
    }, 5000);
  }, []);

  // Register for push notifications and get Expo token
  useEffect(() => {
    (async () => {
      if (!Device.isDevice) {
        console.log('Push notifications only work on a physical device.');
        return;
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      console.log('Expo push token:', token);
      setExpoPushToken(token);
    })();
  }, []);

  const loadChats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get<Chat[]>(
        `${API_URL}/api/chat/user/${currentUser._id}`,
      );
      const sorted = [...res.data].sort((a, b) => {
        const aTime = new Date(a.acceptedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.acceptedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });
      setChats(sorted);
    } catch (err: any) {
      showError(
        err?.response?.data?.error ?? 'Failed to load chats',
      );
    }
  }, [currentUser, showError]);

  const loadMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const res = await axios.get<{
        data: Message[];
      }>(`${API_URL}/api/chat/${selectedChat._id}/messages?limit=100`);
      setMessages(res.data.data ?? []);
    } catch (err: any) {
      showError(
        err?.response?.data?.error ?? 'Failed to load messages',
      );
    }
  }, [selectedChat, showError]);

  useEffect(() => {
    if (currentUser) {
      loadChats();
    }
  }, [currentUser, loadChats]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChat, loadMessages]);

  // Socket connection
  useEffect(() => {
    if (!currentUser) return;

    setConnectionStatus('connecting');
    const s = io(API_URL, { transports: ['websocket'] });

    s.on('connect', () => {
      setConnectionStatus('connected');
      s.emit('USER_CONNECT', { userId: currentUser._id });
    });

    s.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    s.on('connect_error', () => {
      setConnectionStatus('disconnected');
      showError(`Failed to connect to server at ${API_URL}`);
    });

    s.on('MESSAGE_RECEIVED', (data: any) => {
      if (data.chatId === selectedChat?._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }
      loadChats();
    });

    s.on('MESSAGE_DELETED', (data: any) => {
      if (data.chatId === selectedChat?._id) {
        setMessages((prev) =>
          prev.filter((m) => m._id !== data.messageId),
        );
      }
      showSuccess('Message removed');
    });

    s.on('CHAT_REQUEST', () => {
      loadChats();
      showSuccess('New chat request received!');
    });

    s.on('CHAT_ACCEPTED', (data: any) => {
      loadChats();
      if (data.chat._id === selectedChat?._id) {
        setSelectedChat(data.chat);
      }
      showSuccess('Chat request accepted!');
    });

    s.on('ERROR', (data: any) => {
      showError(data.error ?? 'Unexpected error');
    });

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [API_URL, currentUser, selectedChat?._id, loadChats, showError, showSuccess]);

  // Backend health check (like web app)
  useEffect(() => {
    axios
      .get(`${API_URL}/health`)
      .catch(() =>
        showError(
          `Cannot connect to backend at ${API_URL}. Make sure the server is running.`,
        ),
      );
  }, [showError]);

  const handleEnter = async () => {
    if (!newUsername.trim() || !newPassword) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post<User>(
        `${API_URL}/api/users/enter`,
        {
          username: newUsername.trim(),
          password: newPassword,
        },
      );
      const user = res.data;
      setCurrentUser(user);

      // Send Expo push token to backend (if we have it)
      if (expoPushToken) {
        try {
          await axios.post(`${API_URL}/api/users/push-token`, {
            userId: user._id,
            token: expoPushToken,
          });
        } catch (err) {
          console.log('Failed to save push token', err);
        }
      }
      setNewUsername('');
      setNewPassword('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        (err?.response?.status === 401
          ? 'Invalid password'
          : 'Failed to enter');
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!currentUser || !newChatUserId.trim()) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/chat/request`, {
        fromUserId: currentUser._id,
        toUserId: newChatUserId.trim(),
      });
      setShowNewChat(false);
      setNewChatUserId('');
      loadChats();
      showSuccess('Chat request sent!');
    } catch (err: any) {
      showError(
        err?.response?.data?.error ?? 'Failed to create chat',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChat = async (chat: Chat) => {
    if (!currentUser) return;
    try {
      await axios.post(
        `${API_URL}/api/chat/${chat._id}/accept`,
        { userId: currentUser._id },
      );
      loadChats();
      if (chat._id === selectedChat?._id) {
        setSelectedChat({ ...chat, status: 'accepted' });
      }
      showSuccess('Chat accepted!');
    } catch (err: any) {
      showError(
        err?.response?.data?.error ?? 'Failed to accept chat',
      );
    }
  };

  const handleSendMessage = async () => {
    if (
      !messageInput.trim() ||
      !selectedChat ||
      !currentUser ||
      !socket
    )
      return;
    if (selectedChat.status !== 'accepted') {
      showError('Chat must be accepted before sending messages');
      return;
    }
    const content = messageInput.trim();
    const replyToId = replyingTo?._id;
    setMessageInput('');
    setReplyingTo(null);
    try {
      socket.emit('MESSAGE_SEND', {
        chatId: selectedChat._id,
        content,
        senderId: currentUser._id,
        replyToId,
      });
    } catch {
      // restore on failure
      setMessageInput(content);
      if (replyToId && replyingTo) setReplyingTo(replyingTo);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !currentUser) return;
    socket.emit('MESSAGE_DELETE', {
      messageId,
      userId: currentUser._id,
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
    setConnectionStatus('disconnected');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const getOtherParticipantName = useCallback(
    (chat: Chat) => {
      if (!currentUser) return 'Unknown';
      if (chat.otherParticipant?.username) {
        return chat.otherParticipant.username;
      }
      const otherId =
        chat.participants.find(
          (id) => String(id) !== String(currentUser._id),
        ) ?? 'Unknown';
      return otherId;
    },
    [currentUser],
  );

  const groupedMessages = useMemo(() => {
    const groups: Array<{
      id: string;
      date: string;
      items: Message[];
    }> = [];
    let currentKey: string | null = null;
    let current: Message[] = [];

    for (const msg of messages) {
      const k = getDateKey(msg.createdAt);
      if (k !== currentKey) {
        if (currentKey) {
          groups.push({
            id: currentKey,
            date: currentKey,
            items: current,
          });
        }
        currentKey = k;
        current = [msg];
      } else {
        current.push(msg);
      }
    }
    if (currentKey) {
      groups.push({
        id: currentKey,
        date: currentKey,
        items: current,
      });
    }
    return groups;
  }, [messages]);

  // ===== Screens =====
  if (!currentUser) {
    // Login screen, full-screen like web modal
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loginContainer}>
          <Text style={styles.appTitle}>💬 Chat App</Text>
          <Text style={styles.subtitle}>
            Enter your username and password to sign in or create an
            account.
          </Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor={theme.textSecondary}
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password (min 6 characters)"
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.disabledButton,
            ]}
            disabled={loading}
            onPress={handleEnter}
          >
            {loading ? (
              <ActivityIndicator color={theme.textPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Enter</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isInChat = !!selectedChat;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isInChat && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedChat(null)}
              >
                <Text style={styles.backButtonIcon}>{'‹'}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>💬 Chat</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.userBadge}>
              <Text
                style={styles.userBadgeText}
                numberOfLines={1}
              >
                {currentUser.username}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                connectionStatus === 'connected'
                  ? styles.statusConnected
                  : styles.statusDisconnected,
              ]}
            />
          </View>
        </View>

        {/* Body: either chat list or messages */}
        {!isInChat ? (
          <View style={styles.body}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionTitle}>Chats</Text>
              <TouchableOpacity
                style={styles.newChatButton}
                onPress={() => setShowNewChat(true)}
              >
                <Text style={styles.newChatButtonText}>+ New</Text>
              </TouchableOpacity>
            </View>
            {chats.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No chats yet. Start a new chat!
                </Text>
              </View>
            ) : (
              <FlatList
                data={chats}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.chatList}
                renderItem={({ item }) => {
                  const isPending = item.status === 'pending';
                  const isInitiator =
                    String(item.initiatedBy) ===
                    String(currentUser._id);
                  return (
                    <TouchableOpacity
                      style={styles.chatItem}
                      onPress={() => {
                        setSelectedChat(item);
                      }}
                    >
                      <View style={styles.chatItemHeader}>
                        <Text
                          style={styles.chatItemName}
                          numberOfLines={1}
                        >
                          {getOtherParticipantName(item)}
                        </Text>
                        <Text
                          style={[
                            styles.chatStatusBadge,
                            item.status === 'accepted'
                              ? styles.chatStatusAccepted
                              : item.status === 'pending'
                              ? styles.chatStatusPending
                              : styles.chatStatusRejected,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                      {isPending && !isInitiator && (
                        <TouchableOpacity
                          style={[
                            styles.smallPrimaryButton,
                            { marginTop: 8 },
                          ]}
                          onPress={() => handleAcceptChat(item)}
                        >
                          <Text style={styles.smallPrimaryButtonText}>
                            Accept
                          </Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* New chat sheet */}
            {showNewChat && (
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Start New Chat</Text>
                <Text style={styles.sheetSubtitle}>
                  Paste the other user&apos;s ID to start a new chat.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="User ID"
                  placeholderTextColor={theme.textSecondary}
                  value={newChatUserId}
                  onChangeText={setNewChatUserId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.sheetButtonsRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setShowNewChat(false);
                      setNewChatUserId('');
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleCreateChat}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator
                        color={theme.textPrimary}
                      />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Create
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.body}>
            {/* Chat header (participant name) */}
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderName}>
                {getOtherParticipantName(selectedChat)}
              </Text>
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.smallSecondaryButton}
              >
                <Text style={styles.smallSecondaryButtonText}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>

            {/* Messages list */}
            <FlatList
              ref={messagesListRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() =>
                messagesListRef.current?.scrollToEnd({ animated: true })
              }
              data={groupedMessages}
              keyExtractor={(g) => g.id}
              renderItem={({ item: group }) => (
                <View>
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>
                      {formatDateLabel(group.date)}
                    </Text>
                  </View>
                  {group.items.map((message) => {
                    const isOwn =
                      String(message.senderId) ===
                      String(currentUser._id);
                    return (
                      <View
                        key={message._id}
                        style={[
                          styles.messageRow,
                          isOwn
                            ? styles.messageRowOwn
                            : styles.messageRowOther,
                        ]}
                      >
                        <View style={styles.messageBubbleWrapper}>
                          <View
                            style={[
                              styles.messageBubble,
                              isOwn
                                ? styles.messageBubbleOwn
                                : styles.messageBubbleOther,
                            ]}
                          >
                            {message.replyTo && (
                              <View
                                style={styles.replyContext}
                              >
                                <Text
                                  style={styles.replyContextName}
                                >
                                  {String(
                                    message.replyTo.senderId,
                                  ) === String(currentUser._id)
                                    ? 'You'
                                    : message.replyTo
                                        .senderName ?? 'User'}
                                </Text>
                                <Text
                                  style={styles.replyContextText}
                                  numberOfLines={1}
                                >
                                  {
                                    message.replyTo
                                      .content
                                  }
                                </Text>
                              </View>
                            )}
                            <Text style={styles.messageText}>
                              {linkify(
                                message.content,
                                message._id,
                              )}
                            </Text>
                          </View>
                          <View style={styles.messageActions}>
                            <TouchableOpacity
                              style={styles.iconButton}
                              onPress={() =>
                                setReplyingTo(message)
                              }
                            >
                              <Text style={styles.iconButtonText}>
                                ↩
                              </Text>
                            </TouchableOpacity>
                            {isOwn && (
                              <TouchableOpacity
                                style={[
                                  styles.iconButton,
                                  styles.iconButtonDanger,
                                ]}
                                onPress={() =>
                                  handleDeleteMessage(
                                    message._id,
                                  )
                                }
                              >
                                <Text
                                  style={
                                    styles.iconButtonText
                                  }
                                >
                                  🗑
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <Text style={styles.messageTime}>
                          {formatTime(message.createdAt)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            />

            {/* Reply preview */}
            {replyingTo && (
              <View style={styles.replyPreview}>
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.replyPreviewLabel}>
                    Replying to{' '}
                    {String(replyingTo.senderId) ===
                    String(currentUser._id)
                      ? 'you'
                      : replyingTo.senderName ?? 'user'}
                  </Text>
                  <Text
                    style={styles.replyPreviewText}
                    numberOfLines={1}
                  >
                    {replyingTo.content}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyingTo(null)}
                >
                  <Text style={styles.replyPreviewClose}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input area */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message…"
                placeholderTextColor={theme.textSecondary}
                value={messageInput}
                onChangeText={setMessageInput}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !messageInput.trim() &&
                    styles.disabledButton,
                ]}
                onPress={handleSendMessage}
                disabled={!messageInput.trim()}
              >
                <Text style={styles.primaryButtonText}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Toasts */}
        {error ? (
          <View style={[styles.toast, styles.toastError]}>
            <Text style={styles.toastText}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={[styles.toast, styles.toastSuccess]}>
            <Text style={styles.toastText}>{success}</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bgPage,
  },
  container: {
    flex: 1,
    backgroundColor: theme.bgPrimary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bgSecondary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.bgTertiary,
  },
  backButtonIcon: {
    color: theme.textSecondary,
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadge: {
    maxWidth: 130,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.accentSoft,
    marginRight: 8,
  },
  userBadgeText: {
    color: theme.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusConnected: {
    backgroundColor: theme.success,
  },
  statusDisconnected: {
    backgroundColor: theme.error,
  },
  body: {
    flex: 1,
  },
  loginContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.textPrimary,
    fontSize: 15,
    backgroundColor: theme.bgTertiary,
  },
  errorBox: {
    backgroundColor: theme.errorBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: theme.error,
    fontSize: 13,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: theme.accent,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.5,
  },
  listHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  newChatButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.bgTertiary,
  },
  newChatButtonText: {
    color: theme.textPrimary,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyStateText: {
    color: theme.textSecondary,
    textAlign: 'center',
  },
  chatList: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  chatItem: {
    borderRadius: 10,
    padding: 12,
    backgroundColor: theme.bgTertiary,
    marginBottom: 8,
  },
  chatItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatItemName: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  chatStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chatStatusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: theme.warning,
  },
  chatStatusAccepted: {
    backgroundColor: theme.successBg,
    color: theme.success,
  },
  chatStatusRejected: {
    backgroundColor: theme.errorBg,
    color: theme.error,
  },
  smallPrimaryButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.accent,
    alignSelf: 'flex-start',
  },
  smallPrimaryButtonText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: theme.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.bgHover,
    marginBottom: 10,
  },
  sheetTitle: {
    color: theme.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: theme.textSecondary,
    fontSize: 13,
    marginBottom: 14,
  },
  sheetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgTertiary,
  },
  secondaryButtonText: {
    color: theme.textPrimary,
    fontSize: 15,
  },
  chatHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatHeaderName: {
    color: theme.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  smallSecondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgTertiary,
  },
  smallSecondaryButtonText: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateSeparator: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: theme.bgTertiary,
    borderWidth: 1,
    borderColor: theme.border,
    marginVertical: 4,
  },
  dateSeparatorText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  messageRow: {
    marginVertical: 4,
    maxWidth: '78%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleOwn: {
    backgroundColor: theme.bubbleSent,
    borderWidth: 1,
    borderColor: theme.bubbleSentBorder,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: theme.bubbleReceived,
    borderWidth: 1,
    borderColor: theme.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: theme.textPrimary,
    fontSize: 14,
  },
  messageActions: {
    flexDirection: 'row',
    marginLeft: 6,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  iconButtonText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  iconButtonDanger: {},
  messageTime: {
    marginTop: 2,
    fontSize: 11,
    color: theme.textSecondary,
    paddingHorizontal: 4,
  },
  replyContext: {
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
    paddingLeft: 8,
    marginBottom: 4,
  },
  replyContextName: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  replyContextText: {
    color: theme.textPrimary,
    fontSize: 12,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.bgSecondary,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewLabel: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  replyPreviewText: {
    color: theme.textPrimary,
    fontSize: 13,
  },
  replyPreviewClose: {
    color: theme.textSecondary,
    fontSize: 22,
    paddingHorizontal: 8,
  },
  inputRow: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: theme.textPrimary,
    fontSize: 15,
    backgroundColor: theme.bgTertiary,
  },
  link: {
    color: theme.accent,
    textDecorationLine: 'underline',
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastError: {
    backgroundColor: theme.errorBg,
  },
  toastSuccess: {
    backgroundColor: theme.successBg,
  },
  toastText: {
    color: theme.textPrimary,
    fontSize: 13,
  },
});

