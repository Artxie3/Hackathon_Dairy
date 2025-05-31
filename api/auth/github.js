export default function handler(req, res) {
  // Simple CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'API is working',
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
        return res.status(400).json({ error: 'Code required' });
      }

      if (!process.env.GITHUB_CLIENT_ID) {
        return res.status(500).json({ error: 'Missing GITHUB_CLIENT_ID' });
      }

      if (!process.env.GITHUB_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Missing GITHUB_CLIENT_SECRET' });
      }

      // Simple test response
      return res.status(200).json({ 
        success: true, 
        message: 'POST received',
        codeLength: code.length 
      });

    } catch (error) {
      return res.status(500).json({ 
        error: error.message || 'Unknown error' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 