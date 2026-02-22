import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { CreateUserRequest } from '../types';

export class UserController {
  /**
   * Create a new user
   * POST /api/users
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateUserRequest = req.body;

      if (!data.username || data.username.trim().length === 0) {
        res.status(400).json({ error: 'Username is required', statusCode: 400 });
        return;
      }

      const user = await userService.createUser(data);
      res.status(201).json(user);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Enter by username: login if exists, otherwise create and return.
   * POST /api/users/enter
   */
  async enterByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.body;
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        res.status(400).json({ error: 'Username is required', statusCode: 400 });
        return;
      }

      const user = await userService.enterByUsername(username.trim());
      res.status(200).json(user);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * List all users (optionally exclude one by ID)
   * GET /api/users?exclude=userId
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const excludeId = req.query.exclude as string | undefined;
      const users = await userService.listUsers(excludeId);
      res.status(200).json(users);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Search users by username
   * GET /api/users/search?q=&exclude=userId
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string || '').trim();
      const excludeId = req.query.exclude as string | undefined;
      if (!q) {
        // Empty query — fall back to listing all
        const users = await userService.listUsers(excludeId);
        res.status(200).json(users);
        return;
      }
      const users = await userService.searchUsers(q, excludeId);
      res.status(200).json(users);
    } catch (error: any) {
      next(error);
    }
  }
}

export default new UserController();
