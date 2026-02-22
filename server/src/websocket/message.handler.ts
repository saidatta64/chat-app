import { Socket, Server as SocketIOServer } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  MessageSendData,
} from '../types/socket.types';
import chatService from '../services/chat.service';
import { ChatResponse } from '../types';

export class MessageHandler {
  /**
   * Handle MESSAGE_SEND event
   */
  async handleMessageSend(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: MessageSendData,
    onlineUsers: Map<string, string>
  ): Promise<void> {
    const { chatId, content, senderId, replyToId } = data;

    // Validate input
    if (!chatId || !content || !senderId) {
      socket.emit('ERROR', {
        error: 'Missing required fields',
        message: 'chatId, content, and senderId are required',
      });
      return;
    }

    // Validate chat and user participation
    try {
      const chat = await chatService.validateChatParticipants(chatId, senderId);

      // Verify chat is accepted
      if (chat.status !== 'accepted') {
        socket.emit('ERROR', {
          error: 'Chat not accepted',
          message: 'Cannot send messages to a chat that is not accepted',
        });
        return;
      }

      // Create message
      const message = await chatService.createMessage(chatId, senderId, content, replyToId);

      // Get chat participants
      const participants = chat.participants.map((p) => p.toString());

      // Emit to all participants
      participants.forEach((userId) => {
        const socketId = onlineUsers.get(userId);
        if (socketId) {
          io.to(socketId).emit('MESSAGE_RECEIVED', {
            message,
            chatId,
          });
        }
      });

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
    onlineUsers: Map<string, string>
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
        // Get chat participants to notify them
        const chat = await chatService.getChatById(chatId);
        if (chat) {
          const participants = chat.participants.map((p) => p.toString());
          participants.forEach((pId) => {
            const socketId = onlineUsers.get(pId);
            if (socketId) {
              io.to(socketId).emit('MESSAGE_DELETED', {
                messageId,
                chatId,
              });
            }
          });
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
   * Notify users of new chat request
   */
  notifyChatRequest(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    chat: ChatResponse,
    onlineUsers: Map<string, string>
  ): void {
    // Notify the recipient (not the initiator)
    const recipientId = chat.participants.find(
      (p) => p !== chat.initiatedBy
    );
    
    if (recipientId) {
      const socketId = onlineUsers.get(recipientId);
      if (socketId) {
        io.to(socketId).emit('CHAT_REQUEST', { chat });
      }
    }
  }

  /**
   * Notify users of accepted chat
   */
  notifyChatAccepted(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
    chat: ChatResponse,
    onlineUsers: Map<string, string>
  ): void {
    // Notify both participants
    chat.participants.forEach((userId) => {
      const socketId = onlineUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit('CHAT_ACCEPTED', { chat });
      }
    });
  }
}

export default new MessageHandler();
