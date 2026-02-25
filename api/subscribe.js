export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
  const DC = API_KEY.split("-")[1]; // e.g. "us14"

  const response = await fetch(
    `https://${DC}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`anystring:${API_KEY}`).toString("base64")}`
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        tags: ["waitlist"]
      })
    }
  );

  const data = await response.json();

  // Already subscribed is fine
  if (response.ok || data.title === "Member Exists") {
    return res.status(200).json({ success: true });
  }

  return res.status(500).json({ error: data.detail || "Failed to subscribe" });
}