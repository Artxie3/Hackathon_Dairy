export default async function handler(req, res) {
  // Simple CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'GitHub OAuth API is working',
      timestamp: new Date().toISOString(),
      envCheck: {
        hasClientId: !!process.env.GITHUB_CLIENT_ID,
        hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
        clientIdLength: process.env.GITHUB_CLIENT_ID ? process.env.GITHUB_CLIENT_ID.length : 0
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_ID missing' });
    }

    if (!clientSecret) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_SECRET missing' });
    }

    // Exchange code for token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    if (!response.ok) {
      return res.status(500).json({ 
        error: `GitHub API error: ${response.status}` 
      });
    }

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ 
        error: data.error_description || data.error 
      });
    }

    if (!data.access_token) {
      return res.status(400).json({ error: 'No access token received' });
    }

    return res.status(200).json({ access_token: data.access_token });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message || 'Unknown error'
    });
  }
} 