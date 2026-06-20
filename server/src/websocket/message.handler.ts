import { Socket, Server as SocketIOServer } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  MessageSendData,
  TypingData,
} from '../types/socket.types';
import chatService from '../services/chat.service';
import { ChatResponse } from '../types';
import notificationService from '../services/notification.service';
import userService from '../services/user.service';
import onlineUsersService from '../services/onlineUsers.service';

export class MessageHandler {
  /**
   * Handle MESSAGE_SEND event
   */
  async handleMessageSend(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: MessageSendData,
  ): Promise<void> {
    const { chatId, content, senderId, replyToId } = data;

    if (!chatId || !content || !senderId) {
      socket.emit('ERROR', {
        error: 'Missing required fields',
        message: 'chatId, content, and senderId are required',
      });
      return;
    }

    try {
      const chat = await chatService.validateChatParticipants(chatId, senderId);

      if (chat.status !== 'accepted') {
        socket.emit('ERROR', {
          error: 'Chat not accepted',
          message: 'Cannot send messages to a chat that is not accepted',
        });
        return;
      }

      const message = await chatService.createMessage(chatId, senderId, content, replyToId);
      const participants = chat.participants.map((p) => p.toString());

      await Promise.all(
        participants.map(async (userId) => {
          const socketId = await onlineUsersService.getSocketId(userId);
          if (socketId) {
            io.to(socketId).emit('MESSAGE_RECEIVED', { message, chatId });
          }
        }),
      );

      const recipients = participants.filter((id) => id !== senderId);
      if (recipients.length > 0) {
        const senderName = message.senderName || 'New message';
        await notificationService.sendMessageNotification(recipients, {
          senderName,
          content,
          chatId,
          senderId,
        });
      }

      console.log(`Message sent in chat ${chatId} by user ${senderId}`);
    } catch (error: any) {
      socket.emit('ERROR', {
        error: error.message || 'Failed to send message',
        message: 'An error occurred while processing the message',
      });
      throw error;
    }
  }

  /**
   * Handle MESSAGE_DELETE event
   */
  async handleMessageDelete(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: { messageId: string; userId: string },
  ): Promise<void> {
    const { messageId, userId } = data;

    if (!messageId || !userId) {
      socket.emit('ERROR', {
        error: 'Missing required fields',
        message: 'messageId and userId are required',
      });
      return;
    }

    try {
      const { success, chatId } = await chatService.deleteMessage(messageId, userId);

      if (success) {
        const chat = await chatService.getChatById(chatId);
        if (chat) {
          const participants = chat.participants.map((p) => p.toString());
          await Promise.all(
            participants.map(async (pId) => {
              const socketId = await onlineUsersService.getSocketId(pId);
              if (socketId) {
                io.to(socketId).emit('MESSAGE_DELETED', { messageId, chatId });
              }
            }),
          );
        }
        console.log(`Message ${messageId} deleted by user ${userId}`);
      }
    } catch (error: any) {
      socket.emit('ERROR', {
        error: error.message || 'Failed to delete message',
        message: 'An error occurred while deleting the message',
      });
    }
  }

  /**
   * Handle MESSAGE_READ event
   */
  async handleMessageRead(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: { chatId: string; userId: string },
  ): Promise<void> {
    const { chatId, userId } = data;

    if (!chatId || !userId) {
      socket.emit('ERROR', {
        error: 'Missing required fields',
        message: 'chatId and userId are required',
      });
      return;
    }

    try {
      await chatService.markMessagesAsRead(chatId, userId);

      const chat = await chatService.getChatById(chatId);
      if (chat) {
        const participants = chat.participants.map((p) => p.toString());
        await Promise.all(
          participants.map(async (pId) => {
            const socketId = await onlineUsersService.getSocketId(pId);
            if (socketId) {
              io.to(socketId).emit('MESSAGE_READ', {
                chatId,
                userId,
                readAt: new Date(),
              });
            }
          }),
        );
      }
      console.log(`Messages in chat ${chatId} marked as read by user ${userId}`);
    } catch (error: any) {
      socket.emit('ERROR', {
        error: error.message || 'Failed to mark messages as read',
        message: 'An error occurred while marking messages as read',
      });
    }
  }

  /**
   * Handle TYPING event — notify the other participant
   */
  async handleTyping(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    _socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: TypingData,
  ): Promise<void> {
    const { chatId, userId, isTyping } = data;

    if (!chatId || !userId) {
      return;
    }

    try {
      const chat = await chatService.validateChatParticipants(chatId, userId);
      if (chat.status !== 'accepted') {
        return;
      }

      const sender = await userService.getUserById(userId);
      const payload: TypingData = {
        chatId,
        userId,
        isTyping: !!isTyping,
        username: sender?.username,
      };

      const participants = chat.participants.map((p) => p.toString());
      await Promise.all(
        participants.map(async (participantId) => {
          if (participantId === userId) return;
          const socketId = await onlineUsersService.getSocketId(participantId);
          if (socketId) {
            io.to(socketId).emit('TYPING', payload);
          }
        }),
      );
    } catch {
      // Ignore typing errors silently
    }
  }

  /**
   * Notify users of new chat request
   */
  async notifyChatRequest(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    chat: ChatResponse,
  ): Promise<void> {
    const recipientId = chat.participants.find((p) => p !== chat.initiatedBy);

    if (recipientId) {
      const socketId = await onlineUsersService.getSocketId(recipientId);
      if (socketId) {
        io.to(socketId).emit('CHAT_REQUEST', { chat });
      }
    }
  }

  /**
   * Notify users of accepted chat
   */
  async notifyChatAccepted(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    chat: ChatResponse,
  ): Promise<void> {
    await Promise.all(
      chat.participants.map(async (userId) => {
        const socketId = await onlineUsersService.getSocketId(userId);
        if (socketId) {
          io.to(socketId).emit('CHAT_ACCEPTED', { chat });
        }
      }),
    );
  }
}

export default new MessageHandler();
