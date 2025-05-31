import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  name: string;
  supabaseId?: string; // Add Supabase user ID
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
    // Check for auth callback on any page
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    
    if (code) {
      console.log('Found authorization code, processing...');
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
      console.log('Exchanging code for token...');
      // Use our API route to exchange code for token
      const tokenResponse = await fetch('/api/auth/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      const token = tokenData.access_token;
      
      console.log('Token received, loading user...');
      localStorage.setItem('github_token', token);
      await loadUser(token);
      
      // Clean up URL and redirect to dashboard
      window.history.replaceState({}, document.title, '/');
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Authentication failed: ' + (err as Error).message);
      setLoading(false);
      // Don't redirect on error, let user see the error
    }
  };

  const loadUser = async (token: string) => {
    try {
      console.log('Loading user data...');
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
      console.log('User loaded successfully:', githubUser.login);

      // Create or get Supabase user using GitHub data
      const supabaseUser = await createSupabaseUser(githubUser, token);

      // Set the user state with GitHub data and Supabase ID
      setUser({
        id: githubUser.id,
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        name: githubUser.name || githubUser.login,
        supabaseId: supabaseUser?.id
      });
    } catch (err) {
      console.error('Failed to load user:', err);
      setError('Failed to load user data');
      localStorage.removeItem('github_token');
    } finally {
      setLoading(false);
    }
  };

  const createSupabaseUser = async (githubUser: any, token: string) => {
    try {
      // Try to sign in with existing account first
      const email = githubUser.email || `${githubUser.login}@github.user`;
      const password = `gh_${githubUser.id}_secure_password`;

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInData?.user) {
        console.log('Supabase user signed in successfully');
        return signInData.user;
      }

      // If sign in failed, try to create new user
      if (signInError) {
        console.log('Creating new Supabase user...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              github_id: githubUser.id,
              github_login: githubUser.login,
              github_token: token,
              avatar_url: githubUser.avatar_url,
              name: githubUser.name || githubUser.login,
              full_name: githubUser.name || githubUser.login
            }
          }
        });

        if (signUpError) {
          console.error('Supabase signup error:', signUpError);
          return null;
        }

        console.log('Supabase user created successfully');
        return signUpData.user;
      }
    } catch (err) {
      console.error('Error creating Supabase user:', err);
      return null;
    }
  };

  const getGitHubAuthUrl = () => {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GITHUB_CLIENT_ID,
      redirect_uri: 'https://hackathon-dairy.vercel.app/',
      scope: 'read:user user:email',
      response_type: 'code',
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  const login = () => {
    window.location.href = getGitHubAuthUrl();
  };

  const logout = async () => {
    localStorage.removeItem('github_token');
    await supabase.auth.signOut();
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