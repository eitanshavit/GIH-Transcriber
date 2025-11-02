// services/email.ts

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
}

interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export const sendAuthorizationEmail = async (userInfo: UserInfo): Promise<{ success: boolean; error?: string }> => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL_TO;
  const from = process.env.NOTIFICATION_EMAIL_FROM;

  if (!apiKey || !to || !from) {
    const missing = [!apiKey && 'RESEND_API_KEY', !to && 'NOTIFICATION_EMAIL_TO', !from && 'NOTIFICATION_EMAIL_FROM'].filter(Boolean).join(', ');
    const errorMessage = `Email notifications are not fully configured. Missing environment variables: ${missing}`;
    console.error(`[Email Service] ${errorMessage}`);
    // Return a failure state so the calling API route can log this configuration error.
    return { success: false, error: errorMessage }; 
  }

  const payload: EmailPayload = {
    from,
    to,
    subject: `New User Auth: ${userInfo.name || 'Unknown User'}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        <h1 style="color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">Authorization Alert</h1>
        <p>A user has successfully connected their Google Account to the <strong>Audio Transcriber</strong> application.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; display: flex; align-items: center; gap: 15px;">
          ${userInfo.picture ? `<img src="${userInfo.picture}" alt="User avatar" style="width: 50px; height: 50px; border-radius: 50%;" />` : ''}
          <div>
            <strong style="display: block; font-size: 16px;">${userInfo.name || 'Unknown Name'}</strong>
            <a href="mailto:${userInfo.email}" style="color: #555; text-decoration: none;">${userInfo.email || 'No email provided'}</a>
          </div>
        </div>

        <p style="margin-top: 20px;">This is an automated notification. No action is required.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
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