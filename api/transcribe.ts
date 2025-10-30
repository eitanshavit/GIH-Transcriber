// This file is no longer in use.
// The transcription logic has been moved back to the client-side in App.tsx
// to resolve a FUNCTION_INVOCATION_FAILED error on Vercel.

export default async function handler(req, res) {
  res.setHeader('Allow', []);
  return res.status(405).json({ error: 'This endpoint is no longer used.' });
}
