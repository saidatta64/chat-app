import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  UserConnectData,
} from '../types/socket.types';
import messageHandler from './message.handler';

// Map to track online users: userId -> socketId
const onlineUsers = new Map<string, string>();

export class SocketHandler {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          const allowedOrigin = process.env.FRONTEND_URL || process.env.CLIENT_URL;
          if (!allowedOrigin || origin === allowedOrigin || !origin) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle user connection
      socket.on('USER_CONNECT', (data: UserConnectData) => {
        const { userId } = data;
        if (userId) {
          onlineUsers.set(userId, socket.id);
          console.log(`User ${userId} connected with socket ${socket.id}`);
        }
      });

      // Handle message sending
      socket.on('MESSAGE_SEND', async (data) => {
        try {
          await messageHandler.handleMessageSend(this.io, socket, data, onlineUsers);
        } catch (error: any) {
          const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Failed to send message. Please try again.' 
            : (error.message || 'Failed to send message');
          
          socket.emit('ERROR', {
            error: errorMessage,
            code: 'SEND_MESSAGE_FAILED'
          });
          console.error(`WebSocket Error (MESSAGE_SEND):`, error);
        }
      });

      // Handle message deletion
      socket.on('MESSAGE_DELETE', async (data) => {
        try {
          await messageHandler.handleMessageDelete(this.io, socket, data, onlineUsers);
        } catch (error: any) {
          const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Failed to delete message. Please try again.' 
            : (error.message || 'Failed to delete message');
            
          socket.emit('ERROR', {
            error: errorMessage,
            code: 'DELETE_MESSAGE_FAILED'
          });
          console.error(`WebSocket Error (MESSAGE_DELETE):`, error);
        }
      });

      // Handle message read status
      socket.on('MESSAGE_READ', async (data) => {
        try {
          await messageHandler.handleMessageRead(this.io, socket, data, onlineUsers);
        } catch (error: any) {
          const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Failed to mark messages as read.' 
            : (error.message || 'Failed to mark messages as read');
            
          socket.emit('ERROR', {
            error: errorMessage,
            code: 'READ_MESSAGE_FAILED'
          });
          console.error(`WebSocket Error (MESSAGE_READ):`, error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        // Remove user from online users map
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            onlineUsers.delete(userId);
            console.log(`User ${userId} disconnected`);
            break;
          }
        }
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Get Socket.io instance
   */
  getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
    return this.io;
  }

  /**
   * Get online users map
   */
  getOnlineUsers(): Map<string, string> {
    return onlineUsers;
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Emit event to multiple users
   */
  emitToUsers(userIds: string[], event: keyof ServerToClientEvents, data: any): void {
    userIds.forEach((userId) => {
      this.emitToUser(userId, event, data);
    });
  }
}
