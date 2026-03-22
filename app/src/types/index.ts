export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface User {
  _id: string;
  username: string;
  email?: string;
}

export interface Chat {
  _id: string;
  participants: string[];
  status: 'pending' | 'accepted' | 'rejected';
  initiatedBy: string;
  createdAt: string;
  acceptedAt?: string;
  otherParticipant?: { _id: string; username: string };
}

export interface ReplyTo {
  _id: string;
  content: string;
  senderId: string;
  senderName?: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  content: string;
  replyTo?: ReplyTo;
  createdAt: string;
  readAt?: string; // set when the other participant reads the message
}

export interface MessagePayload {
  chatId: string;
  content: string;
  senderId: string;
  replyToId?: string;
}

export interface DeleteMessagePayload {
  messageId: string;
  userId: string;
}
