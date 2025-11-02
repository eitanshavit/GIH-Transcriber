// api/notify-auth.ts
import { sendAuthorizationEmail } from '../services/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userInfo = req.body;

  // Log the authorization event with user details for better tracking.
  console.log(`[Auth Notification] User authorized: ${userInfo?.name || 'Unknown'} (${userInfo?.email || 'No email'}). Triggering notification.`);
  
  try {
    console.log("[Auth Notification] Attempting to send authorization email...");
    const emailResult = await sendAuthorizationEmail(userInfo);
    
    if (emailResult.success) {
      console.log("[Auth Notification] Email notification dispatched successfully.");
      // The primary auth action was successful, and the notification was sent.
      return res.status(202).json({ success: true, message: 'Notification processed.' });
    } else {
      // The email service reported a failure (e.g., missing config, API error).
      // Log the specific error from the email service for debugging.
      console.error(`[Auth Notification] Failed to dispatch email notification: ${emailResult.error}`);
      // We still return a successful status to the client because the primary user-facing
      // action (authentication) was successful. The notification is a background task.
      return res.status(202).json({ success: true, message: 'Notification processed with an internal error.' });
    }
  } catch (error) {
    // This catches unexpected errors in the process of calling the email service.
    console.error("[Auth Notification] An unexpected server error occurred while handling the email notification:", error);
    // In this case, something went wrong on the server, but we still don't want to fail the client request.
    return res.status(202).json({ success: true, message: 'Notification processed with an internal error.' });
  }
}