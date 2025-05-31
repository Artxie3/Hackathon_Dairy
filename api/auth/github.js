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
      env: {
        hasClientId: !!process.env.GITHUB_CLIENT_ID,
        hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET
      }
    });
  }

  if (req.method === 'POST') {
    try {
      const { code } = req.body || {};
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code required' });
      }

      if (!process.env.GITHUB_CLIENT_ID) {
        return res.status(500).json({ error: 'Missing GITHUB_CLIENT_ID' });
      }

      if (!process.env.GITHUB_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Missing GITHUB_CLIENT_SECRET' });
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code
        })
      });

      if (!tokenResponse.ok) {
        return res.status(500).json({ 
          error: `GitHub API error: ${tokenResponse.status}` 
        });
      }

      const tokenData = await tokenResponse.json();

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
      return res.status(500).json({ 
        error: 'Server error',
        details: error.message || 'Unknown error' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 