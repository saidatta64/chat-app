import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { CreateUserRequest, EnterRequest } from '../types';

const MIN_PASSWORD_LENGTH = 6;

export class UserController {
  /**
   * Create a new user (requires password)
   * POST /api/users
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateUserRequest = req.body;

      if (!data.username || data.username.trim().length === 0) {
        res.status(400).json({ error: 'Username is required', statusCode: 400 });
        return;
      }
      if (!data.password || typeof data.password !== 'string') {
        res.status(400).json({ error: 'Password is required', statusCode: 400 });
        return;
      }
      if (data.password.length < MIN_PASSWORD_LENGTH) {
        res.status(400).json({
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          statusCode: 400,
        });
        return;
      }

      const user = await userService.createUser(data);
      res.status(201).json(user);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Enter: login or signup with username + password.
   * POST /api/users/enter
   */
  async enter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password }: EnterRequest = req.body;
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        res.status(400).json({ error: 'Username is required', statusCode: 400 });
        return;
      }
      if (!password || typeof password !== 'string') {
        res.status(400).json({ error: 'Password is required', statusCode: 400 });
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        res.status(400).json({
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          statusCode: 400,
        });
        return;
      }

      const user = await userService.enter(username.trim(), password);
      res.status(200).json(user);
    } catch (error: any) {
      if ((error as any).statusCode === 401) {
        res.status(401).json({ error: error.message || 'Invalid password', statusCode: 401 });
        return;
      }
      next(error);
    }
  }

  /** @deprecated Use enter() instead. */
  async enterByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    (this as any).enter(req, res, next);
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
