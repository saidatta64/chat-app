import { useCallback, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';
import { Chat, Message, User } from '../types';

interface UseChatReturn {
  chats: Chat[];
  messages: Message[];
  loading: boolean;
  loadChats: (userId: string) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  acceptChat: (chatId: string, userId: string) => Promise<void>;
  createChatRequest: (
    fromUserId: string,
    toUserId: string
  ) => Promise<void>;
  addMessageToChat: (message: Message) => void;
  removeMessageFromChat: (messageId: string) => void;
  updateMessageReadAt: (chatId: string, readerUserId: string, readAt: string) => void;
  setMessages: (messages: Message[]) => void;
  setChats: (chats: Chat[]) => void;
}

export function useChat(): UseChatReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChats = useCallback(async (userId: string) => {
    try {
      const res = await axios.get<Chat[]>(
        `${API_URL}/api/chat/user/${userId}`
      );
      const sorted = [...res.data].sort((a, b) => {
        const aTime = new Date(a.acceptedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.acceptedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });
      setChats(sorted);
    } catch (err: any) {
      throw new Error(
        err?.response?.data?.error ?? 'Failed to load chats'
      );
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const res = await axios.get<{
        data: Message[];
      }>(`${API_URL}/api/chat/${chatId}/messages?limit=100`);
      setMessages(res.data.data ?? []);
    } catch (err: any) {
      throw new Error(
        err?.response?.data?.error ?? 'Failed to load messages'
      );
    }
  }, []);

  const acceptChat = useCallback(
    async (chatId: string, userId: string) => {
      try {
        const res = await axios.post<{ chat: Chat }>(
          `${API_URL}/api/chat/${chatId}/accept`,
          { userId }
        );
        setChats((prev) =>
          prev.map((c) => (c._id === chatId ? res.data.chat : c))
        );
      } catch (err: any) {
        throw new Error(
          err?.response?.data?.error ?? 'Failed to accept chat'
        );
      }
    },
    []
  );

  const createChatRequest = useCallback(
    async (fromUserId: string, toUserId: string) => {
      setLoading(true);
      try {
        await axios.post(`${API_URL}/api/chat/request`, {
          fromUserId,
          toUserId,
        });
      } catch (err: any) {
        throw new Error(
          err?.response?.data?.error ?? 'Failed to create chat'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addMessageToChat = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m._id === message._id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const removeMessageFromChat = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  }, []);

  // Stamp readAt on messages that WE sent but haven't been marked read yet.
  // Called when the server fires MESSAGE_READ for the active chat.
  // readerUserId = the person who just read the messages (NOT us).
  const updateMessageReadAt = useCallback(
    (chatId: string, readerUserId: string, readAt: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          // Only update messages in this chat, sent by someone OTHER than
          // the reader (i.e. messages the reader just saw are ones we sent).
          if (m.chatId === chatId && String(m.senderId) !== String(readerUserId) && !m.readAt) {
            return { ...m, readAt };
          }
          return m;
        })
      );
    },
    []
  );

  return {
    chats,
    messages,
    loading,
    loadChats,
    loadMessages,
    acceptChat,
    createChatRequest,
    addMessageToChat,
    removeMessageFromChat,
    updateMessageReadAt,
    setMessages,
    setChats,
  };
}
