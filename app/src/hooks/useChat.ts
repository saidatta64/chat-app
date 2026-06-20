import { useCallback, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';
import { Chat, Message, User } from '../types';

export const MESSAGES_PAGE_SIZE = 50;

export interface MessagesPagination {
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

interface UseChatReturn {
  chats: Chat[];
  messages: Message[];
  loading: boolean;
  messagesPagination: MessagesPagination | null;
  loadingOlderMessages: boolean;
  loadChats: (userId: string) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  loadOlderMessages: (chatId: string) => Promise<void>;
  acceptChat: (chatId: string, userId: string) => Promise<void>;
  createChatRequest: (
    fromUserId: string,
    toUserId: string
  ) => Promise<void>;
  addMessageToChat: (message: Message) => void;
  removeMessageFromChat: (messageId: string) => void;
  updateMessageReadAt: (chatId: string, readerUserId: string, readAt: string) => void;
  patchMessage: (messageId: string, patch: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  setChats: (chats: Chat[]) => void;
}

export function useChat(): UseChatReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesPagination, setMessagesPagination] =
    useState<MessagesPagination | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

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
        page: number;
        totalPages: number;
        total: number;
      }>(
        `${API_URL}/api/chat/${chatId}/messages?page=1&limit=${MESSAGES_PAGE_SIZE}`,
      );
      setMessages(res.data.data ?? []);
      setMessagesPagination({
        page: res.data.page,
        totalPages: res.data.totalPages,
        total: res.data.total,
        hasMore: res.data.page < res.data.totalPages,
      });
    } catch (err: any) {
      throw new Error(
        err?.response?.data?.error ?? 'Failed to load messages'
      );
    }
  }, []);

  const loadOlderMessages = useCallback(
    async (chatId: string) => {
      if (!messagesPagination?.hasMore || loadingOlderMessages) return;

      setLoadingOlderMessages(true);
      try {
        const nextPage = messagesPagination.page + 1;
        const res = await axios.get<{
          data: Message[];
          page: number;
          totalPages: number;
          total: number;
        }>(
          `${API_URL}/api/chat/${chatId}/messages?page=${nextPage}&limit=${MESSAGES_PAGE_SIZE}`,
        );

        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m._id));
          const older = (res.data.data ?? []).filter((m) => !ids.has(m._id));
          return [...older, ...prev];
        });

        setMessagesPagination({
          page: res.data.page,
          totalPages: res.data.totalPages,
          total: res.data.total,
          hasMore: res.data.page < res.data.totalPages,
        });
      } catch (err: any) {
        throw new Error(
          err?.response?.data?.error ?? 'Failed to load older messages'
        );
      } finally {
        setLoadingOlderMessages(false);
      }
    },
    [messagesPagination, loadingOlderMessages],
  );

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

  const updateMessageReadAt = useCallback(
    (chatId: string, readerUserId: string, readAt: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.chatId === chatId && String(m.senderId) !== String(readerUserId) && !m.readAt) {
            return { ...m, readAt };
          }
          return m;
        })
      );
    },
    []
  );

  const patchMessage = useCallback((messageId: string, patch: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, ...patch } : m)),
    );
  }, []);

  return {
    chats,
    messages,
    loading,
    messagesPagination,
    loadingOlderMessages,
    loadChats,
    loadMessages,
    loadOlderMessages,
    acceptChat,
    createChatRequest,
    addMessageToChat,
    removeMessageFromChat,
    updateMessageReadAt,
    patchMessage,
    setMessages,
    setChats,
  };
}
