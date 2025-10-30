import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = 'https://teachers.gymnasia.co.il';
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';

  if (!origin.startsWith(allowedOrigin) && !referer.startsWith(allowedOrigin)) {
    res.status(403).send('Access denied');
    return;
  }

  // continue your normal logic
  res.status(200).json({ message: 'OK' });
}
