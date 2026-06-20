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

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  isVideo?: boolean;
}

export interface Message {
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
  linkPreview?: LinkPreview;
  createdAt: string;
  readAt?: string;
}

export interface MessagesPagination {
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}
