import User from '../models/User';
import { IUser, CreateUserRequest, UserResponse } from '../types';
import { Types } from 'mongoose';

export class UserService {
  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    try {
      const user = new User(data);
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
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<IUser | null> {
    return await User.findOne({ username: username.trim() });
  }

  /**
   * Enter by username: if user exists, return them (login); otherwise create and return (signup).
   */
  async enterByUsername(username: string): Promise<UserResponse> {
    const trimmed = username.trim();
    if (!trimmed) {
      throw new Error('Username is required');
    }
    const existing = await this.getUserByUsername(trimmed);
    if (existing) {
      return this.toUserResponse(existing);
    }
    return this.createUser({ username: trimmed });
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
