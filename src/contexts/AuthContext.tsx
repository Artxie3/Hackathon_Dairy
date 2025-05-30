import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  connections: {
    github?: string;
    devpost?: string;
    youtube?: string;
    spotify?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  connectService: (service: string, token: string) => Promise<void>;
  disconnectService: (service: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // For demo purposes, we'll use a mock user
  const mockUser: User = {
    id: '1',
    name: 'Alex Developer',
    email: 'alex@example.com',
    avatarUrl: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg',
    connections: {
      github: 'alexdev',
      devpost: 'alexdev',
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock login logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser(mockUser);
    } catch (err) {
      setError('Failed to login. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock registration logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({
        ...mockUser,
        name,
        email
      });
    } catch (err) {
      setError('Failed to register. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const connectService = async (service: string, token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock connection logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (user) {
        setUser({
          ...user,
          connections: {
            ...user.connections,
            [service]: token
          }
        });
      }
    } catch (err) {
      setError(`Failed to connect ${service}. Please try again.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectService = async (service: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock disconnection logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (user) {
        const updatedConnections = { ...user.connections };
        delete updatedConnections[service as keyof typeof updatedConnections];
        
        setUser({
          ...user,
          connections: updatedConnections
        });
      }
    } catch (err) {
      setError(`Failed to disconnect ${service}. Please try again.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    connectService,
    disconnectService
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};