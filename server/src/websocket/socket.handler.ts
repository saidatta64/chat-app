import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HTTPServer } from 'http';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  UserConnectData,
} from '../types/socket.types';
import messageHandler from './message.handler';
import onlineUsersService from '../services/onlineUsers.service';
import { getRedisPubSubClients, isRedisReady } from '../config/redis';

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

  /**
   * Attach Redis pub/sub adapter for multi-instance Socket.io (call after connectRedis).
   */
  attachRedisAdapter(): void {
    if (!isRedisReady()) return;

    const clients = getRedisPubSubClients();
    if (!clients) return;

    this.io.adapter(createAdapter(clients.pub, clients.sub));
    console.log('Socket.io Redis adapter enabled');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('USER_CONNECT', async (data: UserConnectData) => {
        const { userId } = data;
        if (userId) {
          await onlineUsersService.setOnline(userId, socket.id);
          console.log(`User ${userId} connected with socket ${socket.id}`);
        }
      });

      socket.on('MESSAGE_SEND', async (data) => {
        try {
          await messageHandler.handleMessageSend(this.io, socket, data);
        } catch (error: any) {
          const errorMessage =
            process.env.NODE_ENV === 'production'
              ? 'Failed to send message. Please try again.'
              : error.message || 'Failed to send message';

          socket.emit('ERROR', {
            error: errorMessage,
            code: 'SEND_MESSAGE_FAILED',
          });
          console.error(`WebSocket Error (MESSAGE_SEND):`, error);
        }
      });

      socket.on('MESSAGE_DELETE', async (data) => {
        try {
          await messageHandler.handleMessageDelete(this.io, socket, data);
        } catch (error: any) {
          const errorMessage =
            process.env.NODE_ENV === 'production'
              ? 'Failed to delete message. Please try again.'
              : error.message || 'Failed to delete message';

          socket.emit('ERROR', {
            error: errorMessage,
            code: 'DELETE_MESSAGE_FAILED',
          });
          console.error(`WebSocket Error (MESSAGE_DELETE):`, error);
        }
      });

      socket.on('MESSAGE_READ', async (data) => {
        try {
          await messageHandler.handleMessageRead(this.io, socket, data);
        } catch (error: any) {
          const errorMessage =
            process.env.NODE_ENV === 'production'
              ? 'Failed to mark messages as read.'
              : error.message || 'Failed to mark messages as read';

          socket.emit('ERROR', {
            error: errorMessage,
            code: 'READ_MESSAGE_FAILED',
          });
          console.error(`WebSocket Error (MESSAGE_READ):`, error);
        }
      });

      socket.on('TYPING', async (data) => {
        try {
          await messageHandler.handleTyping(this.io, socket, data);
        } catch (error: any) {
          console.error(`WebSocket Error (TYPING):`, error);
        }
      });

      socket.on('disconnect', async () => {
        const userId = await onlineUsersService.removeBySocketId(socket.id);
        if (userId) {
          console.log(`User ${userId} disconnected`);
        }
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
    return this.io;
  }

  async emitToUser(
    userId: string,
    event: keyof ServerToClientEvents,
    data: any,
  ): Promise<void> {
    const socketId = await onlineUsersService.getSocketId(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  async emitToUsers(
    userIds: string[],
    event: keyof ServerToClientEvents,
    data: any,
  ): Promise<void> {
    await Promise.all(userIds.map((userId) => this.emitToUser(userId, event, data)));
  }
}
