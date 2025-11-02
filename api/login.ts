export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { password } = req.body;
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    console.error("APP_PASSWORD environment variable is not set.");
    return res.status(500).json({ error: "Application is not configured correctly." });
  }

  if (password && password === appPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ error: "Invalid password." });
  }
}
