// api/notify-auth.ts
import { sendAuthorizationEmail } from '../services/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Log the authorization event to the server console for basic tracking.
  console.log("[Auth Notification] A user has authorized the application. Triggering notification process.");

  // Asynchronously send the email alert. We don't need to wait for it to complete
  // before responding to the client, as the primary action (auth) is complete.
  // This is a "fire-and-forget" approach.
  sendAuthorizationEmail().catch(error => {
    // This catch is for unexpected errors in the sendAuthorizationEmail function itself,
    // though it's designed to handle its own internal errors gracefully.
    console.error("[Auth Notification] An unexpected error occurred while dispatching the email notification:", error);
  });
  
  // We send a 202 Accepted response because the client doesn't need to wait for
  // the notification to be sent.
  return res.status(202).json({ success: true, message: 'Notification processed.' });
}
