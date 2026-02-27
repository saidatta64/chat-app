import { Document, Types } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email?: string;
  passwordHash?: string;
  createdAt: Date;
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  password: string;
}

export interface EnterRequest {
  username: string;
  password: string;
}

export interface UserResponse {
  _id: string;
  username: string;
  email?: string;
  createdAt: Date;
}

// Chat Types
export interface IChat extends Document {
  _id: Types.ObjectId;
  participants: [Types.ObjectId, Types.ObjectId];
  status: 'pending' | 'accepted' | 'rejected';
  initiatedBy: Types.ObjectId;
  createdAt: Date;
  acceptedAt?: Date;
}

export interface CreateChatRequest {
  fromUserId: string;
  toUserId: string;
}

export interface ChatResponse {
  _id: string;
  participants: string[];
  status: 'pending' | 'accepted' | 'rejected';
  initiatedBy: string;
  createdAt: Date;
  acceptedAt?: Date;
  /** The other participant in the chat (for list display) */
  otherParticipant?: { _id: string; username: string };
}

// Message Types
export interface IMessage extends Document {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  replyTo?: Types.ObjectId;
  createdAt: Date;
  readAt?: Date;
}

export interface MessageResponse {
  _id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  content: string;
  replyTo?: {
    _id: string;
    content: string;
    senderId: string;
    senderName?: string;
  };
  createdAt: Date;
  readAt?: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Error Types
export interface ApiError {
  error: string;
  statusCode: number;
  details?: any;
}
