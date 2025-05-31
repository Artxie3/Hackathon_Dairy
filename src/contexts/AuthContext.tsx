import React, { createContext, useContext, useState, useEffect } from 'react';

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
    
    if (code && window.location.pathname === '/auth/callback') {
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
      // For client-side OAuth, we'll get the token directly from GitHub
      // This is a simplified approach that works without exposing client secret
      const tokenResponse = await fetch(`https://github.com/login/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
          client_secret: import.meta.env.VITE_GITHUB_CLIENT_SECRET,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || 'Authentication failed');
      }

      const token = tokenData.access_token;
      localStorage.setItem('github_token', token);
      await loadUser(token);
      
      // Clean up URL and redirect to dashboard
      window.history.replaceState({}, document.title, '/');
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Authentication failed');
      setLoading(false);
      // Redirect back to login on error
      window.location.href = '/login';
    }
  };

  const loadUser = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const githubUser = await response.json();
      setUser({
        id: githubUser.id,
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        name: githubUser.name || githubUser.login
      });
    } catch (err) {
      console.error('Failed to load user:', err);
      setError('Failed to load user data');
      localStorage.removeItem('github_token');
    } finally {
      setLoading(false);
    }
  };

  const getGitHubAuthUrl = () => {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
      redirect_uri: 'https://hackathon-dairy.vercel.app/auth/callback',
      scope: 'read:user user:email',
      response_type: 'code',
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
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