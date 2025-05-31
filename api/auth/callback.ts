import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://hackathon-dairy.vercel.app';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const { code } = request.query;

  if (!code) {
    return response.redirect(`${BASE_URL}/login?error=missing_code`);
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.VITE_GITHUB_CLIENT_ID,
        client_secret: process.env.VITE_GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: `${BASE_URL}/api/auth/callback`,
      }),
    });

    const data = await tokenResponse.json();

    if (data.error) {
      console.error('GitHub OAuth error:', data);
      return response.redirect(`${BASE_URL}/login?error=${data.error}`);
    }

    // Redirect to the frontend with the token
    return response.redirect(
      `${BASE_URL}/auth/callback/success?token=${data.access_token}`
    );
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return response.redirect(`${BASE_URL}/login?error=server_error`);
  }
} 