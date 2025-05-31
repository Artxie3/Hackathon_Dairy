import { supabase } from '../../src/utils/supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-GitHub-Event, X-Hub-Signature-256');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.headers['x-github-event'];
    
    if (event !== 'push') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const payload = req.body;
    const { commits, repository, sender } = payload;

    // Process each commit
    for (const commit of commits) {
      const { id: commitHash, message, timestamp } = commit;
      const repoName = repository.full_name;
      const username = sender.login;

      // Create a draft entry for this commit
      const { error } = await supabase
        .from('diary_entries')
        .insert({
          user_id: username,
          title: message.split('\n')[0], // First line of commit message
          content: '',
          commit_hash: commitHash,
          commit_repo: repoName,
          created_at: timestamp,
          updated_at: timestamp,
          is_draft: true,
          tags: ['commit'],
        });

      if (error) {
        console.error('Error creating draft entry:', error);
      }
    }

    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 