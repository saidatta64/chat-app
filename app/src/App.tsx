import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import {
  setupNotificationHandler,
  setupNotificationListeners,
  usePushNotifications,
  useAuth,
  useChat,
  useSocket,
  useToast,
} from './hooks';
import {
  LoginScreen,
  ChatListScreen,
  ChatMessagesScreen,
} from './screens';
import { Toast } from './components';
import { API_URL } from './constants';
import { Chat } from './types';

setupNotificationHandler();

const App: React.FC = () => {
  const { currentUser, loading: authLoading, login, logout, setCurrentUser, savePushToken } =
    useAuth();
  const {
    chats,
    messages,
    loading: chatLoading,
    loadChats,
    loadMessages,
    acceptChat,
    createChatRequest,
    addMessageToChat,
    removeMessageFromChat,
    updateMessageReadAt,
  } = useChat();
  const { expoPushToken, isLoading: pushTokenLoading, permissionStatus } = usePushNotifications();
  const { error, success, showError, showSuccess } = useToast();
  const [selectedChat, setSelectedChat] = React.useState<Chat | null>(null);
  const [messageInput, setMessageInput] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<any>(null);

  // Socket event handlers
  const { socket, connectionStatus, emitMessageRead } = useSocket(currentUser?._id ?? null, {
    onMessageReceived: (data) => {
      if (data.chatId === selectedChat?._id) {
        addMessageToChat(data.message);
        // If we are currently in this chat, tell the server we read it immediately
        if (currentUser && String(data.message.senderId) !== String(currentUser._id)) {
          emitMessageRead(data.chatId, currentUser._id);
        }
      }
      loadChats(currentUser?._id ?? '');
    },
    onMessageDeleted: (data) => {
      if (data.chatId === selectedChat?._id) {
        removeMessageFromChat(data.messageId);
      }
      showSuccess('Message removed');
    },
    onMessageRead: (data) => {
      // data = { chatId, userId (the reader), readAt }
      if (data.chatId === selectedChat?._id) {
        updateMessageReadAt(data.chatId, data.userId, data.readAt);
      }
    },
    onChatRequest: () => {
      loadChats(currentUser?._id ?? '');
      showSuccess('New chat request received!');
    },
    onChatAccepted: (data) => {
      loadChats(currentUser?._id ?? '');
      if (data.chat._id === selectedChat?._id) {
        setSelectedChat(data.chat);
      }
      showSuccess('Chat request accepted!');
    },
    onError: (data) => {
      showError(data.error ?? 'Unexpected error');
    },
  });

  // Load chats when user logs in
  useEffect(() => {
    if (currentUser) {
      loadChats(currentUser._id);
    }
  }, [currentUser, loadChats]);

  // Load messages when chat is selected + mark as read
  useEffect(() => {
    if (selectedChat && currentUser) {
      loadMessages(selectedChat._id);
      // Tell the server we've read this chat as soon as we open it
      emitMessageRead(selectedChat._id, currentUser._id);
    }
  }, [selectedChat?._id]);

  // Health check and push token registration
  useEffect(() => {
    axios.get(`${API_URL}/health`).catch(() =>
      showError(
        `Cannot connect to backend at ${API_URL}. Make sure the server is running.`,
      ),
    );
  }, [showError]);

  useEffect(() => {
    if (currentUser && expoPushToken) {
      savePushToken(currentUser._id, expoPushToken);
      showSuccess('✅ Push notifications enabled');
    }
  }, [currentUser, expoPushToken, savePushToken, showSuccess]);

  // Setup notification listeners
  useEffect(() => {
    if (!currentUser) return;

    const cleanup = setupNotificationListeners(
      // onNotificationReceived
      (notification) => {
        const data = notification.request.content.data as any;
        if (data?.chatId) {
          // Show notification indicator that new message arrived
          showSuccess(`New message from ${data.senderName || 'User'}`);
        }
      },
      // onNotificationResponse
      (response) => {
        const data = response.notification.request.content.data as any;
        if (data?.chatId) {
          // Find and select the chat when user taps notification
          const targetChat = chats.find((c) => c._id === data.chatId);
          if (targetChat) {
            setSelectedChat(targetChat);
            loadMessages(targetChat._id);
            showSuccess('Opened chat');
          }
        }
      }
    );

    return cleanup;
  }, [currentUser, chats, loadMessages, showSuccess]);

  // Handle login
  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
      showSuccess('Logged in successfully!');
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setSelectedChat(null);
    setMessageInput('');
    setReplyingTo(null);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (
      !messageInput.trim() ||
      !selectedChat ||
      !currentUser ||
      !socket
    )
      return;

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
      setMessageInput(content);
      if (replyToId && replyingTo) setReplyingTo(replyingTo);
      showError('Failed to send message');
    }
  };

  // Handle delete message
  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !currentUser) return;

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            socket.emit('MESSAGE_DELETE', {
              messageId,
              userId: currentUser._id,
            });
          },
        },
      ]
    );
  };

  // Handle create chat
  const handleCreateChat = async (toUserId: string) => {
    if (!currentUser) return;
    try {
      await createChatRequest(currentUser._id, toUserId);
      await loadChats(currentUser._id);
      showSuccess('Chat request sent!');
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Handle accept chat
  const handleAcceptChat = async (chat: Chat) => {
    if (!currentUser) return;
    try {
      await acceptChat(chat._id, currentUser._id);
      showSuccess('Chat accepted!');
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Render screens based on auth state
  if (!currentUser) {
    return (
      <SafeAreaProvider>
        <LoginScreen
          onLogin={handleLogin}
          loading={authLoading}
          error={error}
        />
        {success && <Toast message={success} type="success" />}
      </SafeAreaProvider>
    );
  }

  if (selectedChat) {
    return (
      <SafeAreaProvider>
        <ChatMessagesScreen
          chat={selectedChat}
          messages={messages}
          currentUser={currentUser}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          replyingTo={replyingTo}
          onReplyingToChange={setReplyingTo}
          onBackPress={() => setSelectedChat(null)}
        />
        {error && <Toast message={error} type="error" />}
        {success && <Toast message={success} type="success" />}
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ChatListScreen
        chats={chats}
        currentUser={currentUser}
        onSelectChat={setSelectedChat}
        onCreateChat={handleCreateChat}
        onAcceptChat={handleAcceptChat}
        onLogout={handleLogout}
        loading={chatLoading}
      />
      {error && <Toast message={error} type="error" />}
      {success && <Toast message={success} type="success" />}
    </SafeAreaProvider>
  );
};

export default App;
