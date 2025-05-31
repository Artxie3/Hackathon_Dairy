interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
}

const BASE_URL = 'https://hackathon-dairy.vercel.app';
export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
export const GITHUB_REDIRECT_URI = `${BASE_URL}/api/auth/callback`;

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
  // The token will be handled by our API route
  // This function is kept for the AuthContext flow
  return code;
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }
  
  return response.json();
} 