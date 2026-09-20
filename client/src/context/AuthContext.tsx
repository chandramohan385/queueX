import React, { createContext, useContext, useState, useEffect } from 'react';
import type { StaffUser } from '../types';
import { loginStaff, getMe, getAuthToken, clearAuthToken } from '../services/api';

interface AuthContextType {
  user: StaffUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getMe();
        setUser(profile);
        setToken(storedToken);
      } catch (err) {
        console.warn('Stored auth token was invalid or expired:', err);
        clearAuthToken();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await loginStaff(email, password);
    setUser(result.user);
    setToken(result.token);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
