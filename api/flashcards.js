export default async function handler(req, res) {
  // Allow requests from the Chrome extension
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Handle GET requests (e.g. visiting in browser)
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Flashcard API is running! Send a POST request with { text } to generate flashcards." });
  }

  const text = req.body?.text;
  if (!text) return res.status(400).json({ error: "No text provided" });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a flashcard generator. Given any text, extract the most important concepts and create flashcards with a "front" and "back".
Rules:
- Front: A clear, concise prompt, question, or concept (max 20 words)
- Back: A clear, accurate answer or explanation (max 60 words)
- Generate between 3 and 10 flashcards depending on the amount of content
- Focus on key facts, definitions, and important concepts
- Return ONLY valid JSON in this exact format, no markdown, no extra text:
{"flashcards": [{"front": "...", "back": "..."}]}`
        },
        {
          role: "user",
          content: `Generate flashcards from this text:\n\n${text}`
        }
      ],
      temperature: 0.4
    })
  });

  const data = await response.json();
  if (!response.ok) return res.status(500).json({ error: data.error?.message || "OpenAI error" });

  try {
    const parsed = JSON.parse(data.choices[0].message.content.trim());
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: "Failed to parse flashcards from AI response" });
  }
}
