import React, { createContext, useContext, useState, useEffect } from 'react';
import { getGitHubAuthUrl, exchangeCodeForToken, fetchGitHubUser } from '../utils/auth';

interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for auth callback
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    
    if (code) {
      handleAuthCallback(code);
    } else {
      // Check for existing session
      const token = localStorage.getItem('github_token');
      if (token) {
        loadUser(token);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const handleAuthCallback = async (code: string) => {
    try {
      const token = await exchangeCodeForToken(code);
      localStorage.setItem('github_token', token);
      await loadUser(token);
      // Remove code from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError('Authentication failed');
      setLoading(false);
    }
  };

  const loadUser = async (token: string) => {
    try {
      const githubUser = await fetchGitHubUser(token);
      setUser({
        id: githubUser.id,
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        name: githubUser.name
      });
    } catch (err) {
      setError('Failed to load user data');
      localStorage.removeItem('github_token');
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = getGitHubAuthUrl();
  };

  const logout = () => {
    localStorage.removeItem('github_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}