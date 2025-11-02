export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!clientId || !apiKey) {
    console.error("Google Cloud credentials are not set in environment variables (GOOGLE_CLIENT_ID, GOOGLE_API_KEY).");
    return res.status(500).json({ error: "Application is not configured correctly. Missing Google Cloud credentials on the server." });
  }

  return res.status(200).json({ clientId, apiKey });
}
