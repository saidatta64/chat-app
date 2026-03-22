import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants';
import { ConnectionStatus, Message } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
}

interface SocketEventHandlers {
  onMessageReceived?: (data: any) => void;
  onMessageDeleted?: (data: any) => void;
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

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!userId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    setConnectionStatus('connecting');
    const s = io(API_URL, { transports: ['websocket'] });

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
      setSocket(null);
    };
  }, [userId]);

  return { socket, connectionStatus };
}
