// services/email.ts

interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export const sendAuthorizationEmail = async (): Promise<{ success: boolean; error?: string }> => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL_TO;
  const from = process.env.NOTIFICATION_EMAIL_FROM;

  if (!apiKey || !to || !from) {
    const missing = [!apiKey && 'RESEND_API_KEY', !to && 'NOTIFICATION_EMAIL_TO', !from && 'NOTIFICATION_EMAIL_FROM'].filter(Boolean).join(', ');
    const errorMessage = `Email notifications are not fully configured. Missing environment variables: ${missing}`;
    console.warn(`[Email Service] ${errorMessage}`);
    // We don't want to fail the user's auth flow if email config is missing.
    // The primary function (auth) succeeded. This is just a notification.
    return { success: true }; 
  }

  const payload: EmailPayload = {
    from,
    to,
    subject: 'New User Authorization on Audio Transcriber',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h1 style="color: #4F46E5;">Authorization Alert</h1>
        <p>A user has successfully connected their Google Account to the <strong>Audio Transcriber</strong> application.</p>
        <p>This is an automated notification. No action is required.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #777;">Timestamp: ${new Date().toUTCString()}</p>
      </div>
    `,
  };

  try { 
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`);
    }

    console.log(`[Email Service] Authorization alert sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[Email Service] Error sending authorization email:`, errorMessage);
    return { success: false, error: errorMessage };
  }
};
