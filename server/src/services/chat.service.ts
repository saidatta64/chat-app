import Chat from '../models/Chat';
import Message from '../models/Message';
import { Types } from 'mongoose';
import {
  IChat,
  CreateChatRequest,
  ChatResponse,
  MessageResponse,
  PaginationQuery,
  PaginatedResponse,
} from '../types';
import userService from './user.service';

export class ChatService {
  /**
   * Create a new chat request
   */
  async createChatRequest(data: CreateChatRequest): Promise<ChatResponse> {
    const { fromUserId, toUserId } = data;

    // Validate user IDs
    if (!Types.ObjectId.isValid(fromUserId) || !Types.ObjectId.isValid(toUserId)) {
      throw new Error('Invalid user ID');
    }

    if (fromUserId === toUserId) {
      throw new Error('Cannot create chat with yourself');
    }

    // Check if both users exist
    const fromUserExists = await userService.userExists(fromUserId);
    const toUserExists = await userService.userExists(toUserId);

    if (!fromUserExists || !toUserExists) {
      throw new Error('One or both users do not exist');
    }

    // Check if chat already exists between these users
    const existingChat = await Chat.findOne({
      participants: { $all: [fromUserId, toUserId] },
    });

    if (existingChat) {
      return this.toChatResponse(existingChat);
    }

    // Create new chat
    const chat = new Chat({
      participants: [new Types.ObjectId(fromUserId), new Types.ObjectId(toUserId)],
      status: 'pending',
      initiatedBy: new Types.ObjectId(fromUserId),
    });

    try {
      const savedChat = await chat.save();
      return this.toChatResponse(savedChat);
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate chat, fetch existing one
        const existing = await Chat.findOne({
          participants: { $all: [fromUserId, toUserId] },
        });
        if (existing) {
          return this.toChatResponse(existing);
        }
      }
      throw error;
    }
  }

  /**
   * Accept a chat request
   */
  async acceptChat(chatId: string, userId: string): Promise<ChatResponse> {
    if (!Types.ObjectId.isValid(chatId) || !Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid chat ID or user ID');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Verify user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('User is not a participant in this chat');
    }

    // Verify user is not the initiator
    if (chat.initiatedBy.toString() === userId) {
      throw new Error('Cannot accept your own chat request');
    }

    // Verify chat is pending
    if (chat.status !== 'pending') {
      throw new Error(`Chat is already ${chat.status}`);
    }

    chat.status = 'accepted';
    chat.acceptedAt = new Date();
    const updatedChat = await chat.save();

    return this.toChatResponse(updatedChat);
  }

  /**
   * Get all chats for a user
   */
  async getUserChats(userId: string): Promise<ChatResponse[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const chats = await Chat.find({
      participants: userId,
    })
      .populate('participants', 'username')
      .populate('initiatedBy', 'username')
      .sort({ createdAt: -1 })
      .lean();

    return chats.map((chat: any) => {
      const base = this.toChatResponseFromRaw(chat);
      const other = chat.participants?.find(
        (p: any) => (p._id?.toString?.() ?? p?.toString?.()) !== userId
      );
      return {
        ...base,
        otherParticipant: other?.username != null
          ? { _id: other._id?.toString?.() ?? String(other), username: other.username }
          : undefined,
      };
    });
  }

  /**
   * Convert raw chat (plain object) to ChatResponse
   */
  private toChatResponseFromRaw(chat: any): ChatResponse {
    const participantIds = (chat.participants || []).map((p: any) =>
      p && typeof p === 'object' && p._id ? p._id.toString() : String(p)
    );
    const initiatedBy =
      chat.initiatedBy && typeof chat.initiatedBy === 'object' && chat.initiatedBy._id
        ? chat.initiatedBy._id.toString()
        : String(chat.initiatedBy ?? '');

    return {
      _id: chat._id.toString(),
      participants: participantIds,
      status: chat.status,
      initiatedBy,
      createdAt: chat.createdAt,
      acceptedAt: chat.acceptedAt,
    };
  }

  /**
   * Get chat by ID
   */
  async getChatById(chatId: string): Promise<IChat | null> {
    if (!Types.ObjectId.isValid(chatId)) {
      return null;
    }
    return await Chat.findById(chatId);
  }

  /**
   * Validate that user is a participant in the chat
   */
  async validateChatParticipants(chatId: string, userId: string): Promise<IChat> {
    if (!Types.ObjectId.isValid(chatId) || !Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid chat ID or user ID');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant) {
      throw new Error('User is not a participant in this chat');
    }

    return chat;
  }

  /**
   * Get paginated messages for a chat
   */
  async getChatMessages(
    chatId: string,
    query: PaginationQuery = {}
  ): Promise<PaginatedResponse<MessageResponse>> {
    if (!Types.ObjectId.isValid(chatId)) {
      throw new Error('Invalid chat ID');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    // Verify chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Get messages
    const messages = await Message.find({ chatId })
      .populate('senderId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Message.countDocuments({ chatId });

    return {
      data: messages.map((msg) => this.toMessageResponse(msg)).reverse(), // Reverse to show oldest first
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new message
   */
  async createMessage(
    chatId: string,
    senderId: string,
    content: string
  ): Promise<MessageResponse> {
    if (!Types.ObjectId.isValid(chatId) || !Types.ObjectId.isValid(senderId)) {
      throw new Error('Invalid chat ID or sender ID');
    }

    // Validate chat exists and user is participant
    const chat = await this.validateChatParticipants(chatId, senderId);

    // Verify chat is accepted
    if (chat.status !== 'accepted') {
      throw new Error('Cannot send messages to a chat that is not accepted');
    }

    // Create message
    const message = new Message({
      chatId: new Types.ObjectId(chatId),
      senderId: new Types.ObjectId(senderId),
      content: content.trim(),
    });

    const savedMessage = await message.save();
    return this.toMessageResponse(savedMessage);
  }

  /**
   * Convert IChat to ChatResponse
   */
  private toChatResponse(chat: IChat): ChatResponse {
    return {
      _id: chat._id.toString(),
      participants: chat.participants.map((p) => p.toString()),
      status: chat.status,
      initiatedBy: chat.initiatedBy.toString(),
      createdAt: chat.createdAt,
      acceptedAt: chat.acceptedAt,
    };
  }

  /**
   * Convert IMessage to MessageResponse
   */
  private toMessageResponse(message: any): MessageResponse {
    // senderId may be ObjectId (unpopulated) or populated User doc; always return ID string
    const senderId =
      message.senderId && typeof message.senderId === 'object' && message.senderId._id
        ? message.senderId._id.toString()
        : String(message.senderId ?? '');
    return {
      _id: message._id.toString(),
      chatId: message.chatId?.toString?.() ?? String(message.chatId),
      senderId,
      content: message.content,
      createdAt: message.createdAt,
      readAt: message.readAt,
    };
  }
}

export default new ChatService();
