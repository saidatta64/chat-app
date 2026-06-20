import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import {
  connectRedis,
  disconnectRedis,
  isRedisConfigured,
  isRedisReady,
} from './config/redis';
import routes from './routes';
import { SocketHandler } from './websocket/socket.handler';
import chatService from './services/chat.service';
import messageHandler from './websocket/message.handler';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3000;

let socketHandler: SocketHandler;

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigin = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    if (!allowedOrigin || origin === allowedOrigin || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    redis: {
      configured: isRedisConfigured(),
      connected: isRedisReady(),
    },
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api', routes);

const originalCreateChatRequest = chatService.createChatRequest.bind(chatService);
chatService.createChatRequest = async (data) => {
  const chat = await originalCreateChatRequest(data);

  if (chat.status === 'pending') {
    const chatResponse = {
      _id: chat._id,
      participants: chat.participants,
      status: chat.status,
      initiatedBy: chat.initiatedBy,
      createdAt: chat.createdAt,
      acceptedAt: chat.acceptedAt,
    };
    await messageHandler.notifyChatRequest(socketHandler.getIO(), chatResponse);
  }

  return chat;
};

const originalAcceptChat = chatService.acceptChat.bind(chatService);
chatService.acceptChat = async (chatId: string, userId: string) => {
  const chat = await originalAcceptChat(chatId, userId);

  const chatResponse = {
    _id: chat._id,
    participants: chat.participants,
    status: chat.status,
    initiatedBy: chat.initiatedBy,
    createdAt: chat.createdAt,
    acceptedAt: chat.acceptedAt,
  };
  await messageHandler.notifyChatAccepted(socketHandler.getIO(), chatResponse);

  return chat;
};

app.use((err: any, _req: Request, res: Response, _next: any) => {
  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  console.error(`[${new Date().toISOString()}] Error ${statusCode}:`, err);

  res.status(statusCode).json({
    error: message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details || undefined,
    }),
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    statusCode: 404,
  });
});

const shutdown = async (signal: string) => {
  console.log(`${signal} signal received: closing HTTP server`);
  httpServer.close(async () => {
    console.log('HTTP server closed');
    await disconnectRedis();
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    await connectRedis();

    socketHandler = new SocketHandler(httpServer);
    socketHandler.attachRedisAdapter();

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'Not set'}`);
      console.log(
        `Redis: ${isRedisReady() ? 'connected' : isRedisConfigured() ? 'configured but unavailable' : 'not configured (in-memory fallback)'}`,
      );
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
