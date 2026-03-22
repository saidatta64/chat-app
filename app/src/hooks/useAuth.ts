import { useCallback, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';
import { User } from '../types';

interface UseAuthReturn {
  currentUser: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  savePushToken: (userId: string, token: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(
    async (username: string, password: string): Promise<User> => {
      setLoading(true);
      try {
        const res = await axios.post<User>(
          `${API_URL}/api/users/enter`,
          {
            username: username.trim(),
            password,
          }
        );
        const user = res.data;
        setCurrentUser(user);
        return user;
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ??
          (err?.response?.status === 401
            ? 'Invalid password'
            : 'Failed to enter');
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const savePushToken = useCallback(
    async (userId: string, token: string) => {
      try {
        await axios.post(`${API_URL}/api/users/push-token`, {
          userId,
          token,
        });
      } catch (err) {
        console.log('Failed to save push token', err);
      }
    },
    []
  );

  return {
    currentUser,
    loading,
    login,
    logout,
    setCurrentUser,
    savePushToken,
  };
}
