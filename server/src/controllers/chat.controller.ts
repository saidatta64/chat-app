import { Request, Response, NextFunction } from 'express';
import chatService from '../services/chat.service';
import { CreateChatRequest, PaginationQuery } from '../types';

export class ChatController {
  /**
   * Create a chat request
   * POST /api/chat/request
   */
  async createChatRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateChatRequest = req.body;

      if (!data.fromUserId || !data.toUserId) {
        res.status(400).json({ error: 'fromUserId and toUserId are required', statusCode: 400 });
        return;
      }

      const chat = await chatService.createChatRequest(data);
      res.status(201).json(chat);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Accept a chat request
   * POST /api/chat/:chatId/accept
   */
  async acceptChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'userId is required in request body', statusCode: 400 });
        return;
      }

      const chat = await chatService.acceptChat(chatId, userId);
      res.status(200).json(chat);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all chats for a user
   * GET /api/chat/user/:userId
   */
  async getUserChats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const chats = await chatService.getUserChats(userId);
      res.status(200).json(chats);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get message history for a chat
   * GET /api/chat/:chatId/messages
   */
  async getChatMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chatId } = req.params;
      const query: PaginationQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await chatService.getChatMessages(chatId, query);
      res.status(200).json(result);
    } catch (error: any) {
      next(error);
    }
  }
}

export default new ChatController();
