interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
}

export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
export const GITHUB_REDIRECT_URI = `${window.location.origin}/auth/callback`;

export function getGitHubAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: 'read:user user:email',
    response_type: 'code',
  });
  
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('/api/auth/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }
  
  const data = await response.json();
  return data.access_token;
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }
  
  return response.json();
} 