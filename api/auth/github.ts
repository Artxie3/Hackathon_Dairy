import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For testing - return method info
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'GitHub OAuth API endpoint', 
      method: req.method,
      envVars: {
        hasClientId: !!process.env.GITHUB_CLIENT_ID,
        hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
        nodeVersion: process.version
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Processing OAuth request...');
    
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
    }

    if (!clientSecret) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_SECRET not configured' });
    }

    console.log('Environment variables OK, exchanging code...');

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Hackathon-Diary'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('GitHub API error:', tokenResponse.status, tokenResponse.statusText);
      return res.status(500).json({ 
        error: `GitHub API error: ${tokenResponse.status}` 
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token response:', { hasAccessToken: !!tokenData.access_token, error: tokenData.error });
    
    if (tokenData.error) {
      return res.status(400).json({ 
        error: tokenData.error_description || tokenData.error 
      });
    }

    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'No access token received' });
    }

    return res.status(200).json({ access_token: tokenData.access_token });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 