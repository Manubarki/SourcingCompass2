import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve built React app
app.use(express.static(join(__dirname, "dist")));

// API route — proxies to Atlan LiteLLM (Claude Sonnet)
app.post("/api/generate", async (req, res) => {
  try {
    const prompt = req.body.messages?.[0]?.content || "";

    const response = await fetch("https://llmproxy.atlan.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LITELLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(500).json({ error: `Non-JSON response: ${rawText.slice(0, 300)}` });
    }

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || JSON.stringify(data) });
    }

    const text = data.choices?.[0]?.message?.content || "{}";
    res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback — send React app for all other routes (SPA)
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`SourcingCompass running on port ${PORT}`);
});
