import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import routes from './routes';
import { SocketHandler } from './websocket/socket.handler';
import chatService from './services/chat.service';
import messageHandler from './websocket/message.handler';

// Load environment variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api', routes);

// Initialize Socket.io
const socketHandler = new SocketHandler(httpServer);

// Integrate Socket.io with chat service events
// When a chat request is created, notify the recipient via WebSocket
const originalCreateChatRequest = chatService.createChatRequest.bind(chatService);
chatService.createChatRequest = async (data) => {
  const chat = await originalCreateChatRequest(data);
  
  // Notify recipient via WebSocket if they're online
  if (chat.status === 'pending') {
    const chatResponse = {
      _id: chat._id,
      participants: chat.participants,
      status: chat.status,
      initiatedBy: chat.initiatedBy,
      createdAt: chat.createdAt,
      acceptedAt: chat.acceptedAt,
    };
    messageHandler.notifyChatRequest(
      socketHandler.getIO(),
      chatResponse,
      socketHandler.getOnlineUsers()
    );
  }
  
  return chat;
};

// When a chat is accepted, notify both participants
const originalAcceptChat = chatService.acceptChat.bind(chatService);
chatService.acceptChat = async (chatId: string, userId: string) => {
  const chat = await originalAcceptChat(chatId, userId);
  
  // Notify both participants via WebSocket
  const chatResponse = {
    _id: chat._id,
    participants: chat.participants,
    status: chat.status,
    initiatedBy: chat.initiatedBy,
    createdAt: chat.createdAt,
    acceptedAt: chat.acceptedAt,
  };
  messageHandler.notifyChatAccepted(
    socketHandler.getIO(),
    chatResponse,
    socketHandler.getOnlineUsers()
  );
  
  return chat;
};

// Error handling middleware (must be after routes)
app.use((err: any, _req: Request, res: Response, _next: any) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  console.error('Error:', err);
  
  res.status(statusCode).json({
    error: message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    statusCode: 404,
  });
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'Not set'}`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

startServer();
