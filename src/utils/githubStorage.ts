// GitHub Gist storage utility for audio files
export async function uploadAudioToGist(audioBlob: Blob, filename: string, githubToken: string): Promise<string> {
  try {
    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob);
    
    const gistData = {
      description: `Voice note: ${filename}`,
      public: false,
      files: {
        [filename]: {
          content: base64Audio
        },
        'metadata.json': {
          content: JSON.stringify({
            type: 'voice-note',
            mimeType: audioBlob.type,
            size: audioBlob.size,
            created: new Date().toISOString()
          })
        }
      }
    };

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gistData)
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist = await response.json();
    return gist.html_url; // Return gist URL
  } catch (error) {
    console.error('Error uploading to GitHub Gist:', error);
    throw error;
  }
}

export async function getAudioFromGist(gistId: string, filename: string, githubToken: string): Promise<Blob> {
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist = await response.json();
    const fileContent = gist.files[filename]?.content;
    const metadata = JSON.parse(gist.files['metadata.json']?.content || '{}');

    if (!fileContent) {
      throw new Error('Audio file not found in gist');
    }

    // Convert base64 back to blob
    return base64ToBlob(fileContent, metadata.mimeType || 'audio/webm');
  } catch (error) {
    console.error('Error getting audio from GitHub Gist:', error);
    throw error;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
} 