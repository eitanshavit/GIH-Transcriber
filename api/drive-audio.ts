import { Buffer } from "buffer";

// Helper function to convert a ReadableStream to a Buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { fileId, accessToken } = req.body;

    if (!fileId || !accessToken) {
      return res.status(400).json({ error: 'Missing required parameters: fileId and accessToken are required.' });
    }

    // Download file from Google Drive
    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!driveResponse.ok) {
        const error = await driveResponse.json();
        console.error("Google Drive API Error:", error);
        return res.status(driveResponse.status).json({ error: `Failed to download file from Google Drive: ${error.error?.message || driveResponse.statusText}` });
    }

    const mimeType = driveResponse.headers.get('content-type') || 'application/octet-stream';
    const audioBuffer = await streamToBuffer(driveResponse.body);

    // Stream the audio data back to the client
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', audioBuffer.length);
    return res.status(200).send(audioBuffer);

  } catch (error) {
    console.error("Error in /api/drive-audio:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: `Failed to fetch audio. ${message}` });
  }
}
