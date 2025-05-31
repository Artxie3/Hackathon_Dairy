import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const { code } = request.query;

  if (!code) {
    return response.status(400).json({ error: 'Code is required' });
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
      }),
    });

    const data = await tokenResponse.json();

    if (data.error) {
      throw new Error(data.error_description || 'Failed to exchange code for token');
    }

    // Redirect to the frontend with the token
    response.redirect(
      `/auth/callback/success?token=${data.access_token}`
    );
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    response.redirect('/auth/callback/error');
  }
} 