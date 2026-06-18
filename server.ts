import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Chatbot endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `You are an AI assistant for the Vehicle Rental Sys (formerly FleetCommand) management system.
You help staff and admins use the system. You have full knowledge of the calculations:
- Daily rates logic
- How outstanding balances are calculated
- How total revenue is computed
- Fleet status distributions

Respond concisely and professionally, primarily explaining how the system works or how numbers are calculated.`;

      // We use systemInstruction as part of the context or configure it on the model.
      const chatMessages = messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      // Add system instruction manually as a first message or configure the model if supported directly.
      // We'll prepend the system instruction.
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: "Understood. I will act as the support bot." }] },
          ...chatMessages
        ]
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || 'An error occurred during chat.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.use('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
