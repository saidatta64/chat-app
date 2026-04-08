import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants';
import { ConnectionStatus } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  emitMessageRead: (chatId: string, userId: string) => void;
}

interface SocketEventHandlers {
  onMessageReceived?: (data: any) => void;
  onMessageDeleted?: (data: any) => void;
  onMessageRead?: (data: { chatId: string; userId: string; readAt: string }) => void;
  onChatRequest?: () => void;
  onChatAccepted?: (data: any) => void;
  onError?: (data: any) => void;
}

export function useSocket(
  userId: string | null,
  handlers: SocketEventHandlers
): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const handlersRef = useRef(handlers);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    setConnectionStatus('connecting');
    const s = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      setConnectionStatus('connected');
      s.emit('USER_CONNECT', { userId });
    });

    s.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    s.on('connect_error', () => {
      setConnectionStatus('disconnected');
      handlersRef.current.onError?.({
        error: `Failed to connect to server at ${API_URL}`,
      });
    });

    s.on('MESSAGE_RECEIVED', (data: any) => {
      handlersRef.current.onMessageReceived?.(data);
    });

    s.on('MESSAGE_DELETED', (data: any) => {
      handlersRef.current.onMessageDeleted?.(data);
    });

    // When the other participant opens/reads the chat, SERVER fires MESSAGE_READ
    // { chatId, userId, readAt } — we update readAt on messages we sent
    s.on('MESSAGE_READ', (data: any) => {
      handlersRef.current.onMessageRead?.(data);
    });

    s.on('CHAT_REQUEST', () => {
      handlersRef.current.onChatRequest?.();
    });

    s.on('CHAT_ACCEPTED', (data: any) => {
      handlersRef.current.onChatAccepted?.(data);
    });

    s.on('ERROR', (data: any) => {
      handlersRef.current.onError?.(data);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [userId]);

  // Stable helper — emits MESSAGE_READ without stale closure issues
  const emitMessageRead = useCallback((chatId: string, userId: string) => {
    socketRef.current?.emit('MESSAGE_READ', { chatId, userId });
  }, []);

  return { socket, connectionStatus, emitMessageRead };
}
