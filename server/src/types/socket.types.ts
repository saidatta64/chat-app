import { MessageResponse, ChatResponse } from './index';

// Client → Server Events
export interface ClientToServerEvents {
  MESSAGE_SEND: (data: MessageSendData) => void;
  USER_CONNECT: (data: UserConnectData) => void;
  USER_DISCONNECT: () => void;
}

// Server → Client Events
export interface ServerToClientEvents {
  MESSAGE_RECEIVED: (data: MessageReceivedData) => void;
  CHAT_REQUEST: (data: ChatRequestData) => void;
  CHAT_ACCEPTED: (data: ChatAcceptedData) => void;
  ERROR: (data: SocketErrorData) => void;
}

// Event Data Types
export interface MessageSendData {
  chatId: string;
  content: string;
  senderId: string;
  replyToId?: string;
}

export interface UserConnectData {
  userId: string;
}

export interface MessageReceivedData {
  message: MessageResponse;
  chatId: string;
}

export interface ChatRequestData {
  chat: ChatResponse;
}

export interface ChatAcceptedData {
  chat: ChatResponse;
}

export interface SocketErrorData {
  error: string;
  message?: string;
}
