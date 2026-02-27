import User from '../models/User';
import { IUser, CreateUserRequest, UserResponse } from '../types';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

export class UserService {
  /**
   * Create a new user (with password)
   */
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    try {
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
      const user = new User({
        username: data.username.trim(),
        email: data.email,
        passwordHash,
      });
      const savedUser = await user.save();
      return this.toUserResponse(savedUser);
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new Error(`${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    return await User.findById(userId);
  }

  /**
   * Get user by username (optionally include passwordHash for auth)
   */
  async getUserByUsername(username: string, includePasswordHash = false): Promise<IUser | null> {
    const q = User.findOne({ username: username.trim() });
    if (includePasswordHash) {
      q.select('+passwordHash');
    }
    return await q;
  }

  /**
   * Enter: login or signup with username + password.
   * - New user: create with password.
   * - Existing user with no password (legacy): set password and return (one-time claim).
   * - Existing user with password: verify and return, or throw.
   */
  async enter(username: string, password: string): Promise<UserResponse> {
    const trimmed = username.trim();
    if (!trimmed) {
      throw new Error('Username is required');
    }
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const existing = await this.getUserByUsername(trimmed, true);
    if (!existing) {
      return this.createUser({ username: trimmed, password });
    }

    const userWithHash = existing as IUser & { passwordHash?: string };
    if (!userWithHash.passwordHash) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      (existing as any).passwordHash = passwordHash;
      await existing.save();
      return this.toUserResponse(existing);
    }

    const match = await bcrypt.compare(password, userWithHash.passwordHash);
    if (!match) {
      const err = new Error('Invalid password') as Error & { statusCode?: number };
      err.statusCode = 401;
      throw err;
    }
    return this.toUserResponse(existing);
  }

  /** @deprecated Use enter() for auth. Kept for backward compatibility. */
  async enterByUsername(_username: string): Promise<UserResponse> {
    throw new Error('Password is required. Use enter(username, password).');
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) {
      return false;
    }
    const user = await User.findById(userId);
    return user !== null;
  }

  /**
   * List all users, optionally excluding one by ID
   */
  async listUsers(excludeId?: string): Promise<UserResponse[]> {
    const filter: any = {};
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const users = await User.find(filter).sort({ username: 1 }).limit(100);
    return users.map((u) => this.toUserResponse(u));
  }

  /**
   * Search users by username (case-insensitive partial match)
   */
  async searchUsers(query: string, excludeId?: string): Promise<UserResponse[]> {
    const filter: any = { username: { $regex: query, $options: 'i' } };
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const users = await User.find(filter).sort({ username: 1 }).limit(20);
    return users.map((u) => this.toUserResponse(u));
  }

  /**
   * Convert IUser to UserResponse
   */
  private toUserResponse(user: IUser): UserResponse {
    return {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

export default new UserService();
