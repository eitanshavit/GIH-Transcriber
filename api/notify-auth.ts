// api/notify-auth.ts

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const notificationEmail = process.env.NOTIFICATION_EMAIL_TO;

  if (notificationEmail) {
    // In a real-world application, you would integrate an email service here
    // (e.g., SendGrid, Resend, Nodemailer) to send an actual email.
    // For security and simplicity, we are logging to the server console instead.
    // You can view these logs in your Vercel project's dashboard.
    console.log(`[Auth Notification] A user has authorized the application. Sending alert to: ${notificationEmail}`);
    
    // Example with a hypothetical email service:
    // await sendEmail({
    //   to: notificationEmail,
    //   from: 'noreply@your-app.com',
    //   subject: 'New User Authorization on Audio Transcriber',
    //   body: 'A user has successfully connected their Google Account to the audio transcriber application.'
    // });

  } else {
    // It's also useful to know if the notification system is being triggered
    // but isn't configured.
    console.log("[Auth Notification] A user authorized the app, but the NOTIFICATION_EMAIL_TO environment variable is not set.");
  }

  // We send a 202 Accepted response because the client doesn't need to wait for
  // the notification to be sent. It's a fire-and-forget action.
  return res.status(202).json({ success: true, message: 'Notification processed.' });
}
