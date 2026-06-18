import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const rates: Record<string, number> = {
    sedan: 50,
    suv: 90,
    truck: 110,
    coupe: 80,
    premium: 150,
    electric: 100,
    van: 120
  };

  wss.on("connection", async (clientWs) => {
    console.log("[Backend] Client connected to voice portal websocket.");
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Backend] Error: GEMINI_API_KEY is not set.");
      clientWs.close();
      return;
    }

    let sessionState = {
      customer_name: "",
      car_type: "",
      duration_days: 0,
      total: 0
    };

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const liveSession = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: ["AUDIO"] as any,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
          },
          systemInstruction: {
            parts: [{
              text: `You are an elite, warm, friendly, brief, and highly conversational voice receptionist for "Philly Car Rental" agency (located at 3041 Vare Ave B, Philadelphia, PA 19145).
Your primary objective is to extract the Customer Name ('customer_name') and requested Vehicle Class Category ('car_type', which MUST map to one of: Sedan, SUV, Truck, Coupe, Premium, Electric, Van).

Ensure you follow these rules exactly:
1. Keep every response to 1-2 sentence maximum. Be extremely brief, crisp, and speak casually like a high-end receptionist. Never use any Markdown, bullet points, asterisks, or nested blocks.
2. If the user wants to book or edit a reservation, immediately trigger the book_appointment or edit_appointment tool with the guest's extracted name, car_type, and duration.
3. CRITICAL: You MUST wait for the tool response to be returned before finalizing your answer. When the tool returns, immediately and verbally explain the premium upgrade costs (the additional fee amount) and the new total cost in your speech. For example: 'Perfect, switching you to an SUV adds an upgrade fee of $120.00, making your new total $450.00. I have updated this live on our board!'. Keep it sweet and conversational.`
            }]
          } as any,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "book_appointment",
                  description: "Creates or books a new car rental slot. Computes daily rental metrics and initial totals.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      customer_name: { type: Type.STRING },
                      car_type: { type: Type.STRING, description: "The requested vehicle category (Sedan, SUV, Truck, Coupe, Premium, Electric, Van)" },
                      duration_days: { type: Type.INTEGER, description: "Duration in days" }
                    },
                    required: ["customer_name", "car_type", "duration_days"]
                  }
                },
                {
                  name: "edit_appointment",
                  description: "Edifies or modifies an existing car rental slot. Calculates upgraded vehicle switch premiums.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      customer_name: { type: Type.STRING },
                      car_type: { type: Type.STRING, description: "The updated vehicle category (Sedan, SUV, Truck, Coupe, Premium, Electric, Van)" },
                      duration_days: { type: Type.INTEGER, description: "Updated duration in days" }
                    },
                    required: ["customer_name", "car_type", "duration_days"]
                  }
                }
              ]
            }
          ]
        },
        callbacks: {
          onmessage: async (liveMsg: any) => {
            // Forward audio output
            const audio = liveMsg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            
            // Forward interruptions
            if (liveMsg.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }

            // Handle function calls
            const toolCall = liveMsg.toolCall;
            if (toolCall) {
              const functionCalls = toolCall.functionCalls;
              if (functionCalls) {
                const functionResponses: any[] = [];
                for (const fc of functionCalls) {
                  const { name: fnName, args, id: callId } = fc;
                  
                  if (fnName === "book_appointment") {
                    const { customer_name, car_type, duration_days } = args;
                    const rType = (car_type || "Sedan").toLowerCase();
                    const rate = rates[rType] || 50;
                    const computedTotal = rate * (duration_days || 3);
                    const additional_fee = 0;

                    sessionState = {
                      customer_name: customer_name || "Guest",
                      car_type: car_type || "Sedan",
                      duration_days: duration_days || 3,
                      total: computedTotal
                    };

                    const output = {
                      status: "success",
                      action: "book",
                      customer_name,
                      car_type,
                      duration_days,
                      additional_fee,
                      new_total: computedTotal,
                      message: `Successfully booked a ${car_type} for ${customer_name}. Duration: ${duration_days} days. Rate: $${rate}/day. No upgrade adjustments.`
                    };

                    functionResponses.push({
                      response: { output },
                      id: callId
                    });

                    clientWs.send(JSON.stringify({ calculation: output }));

                  } else if (fnName === "edit_appointment") {
                    const { customer_name, car_type, duration_days } = args;
                    
                    const prevType = sessionState.car_type || "Sedan";
                    const prevDays = sessionState.duration_days || 3;
                    const prevRate = rates[prevType.toLowerCase()] || 50;
                    const prevTotal = prevRate * prevDays;

                    const rType = (car_type || "Sedan").toLowerCase();
                    const rate = rates[rType] || 50;
                    const computedTotal = rate * (duration_days || 3);
                    const additional_fee = Math.max(0, computedTotal - prevTotal);

                    sessionState = {
                      customer_name: customer_name || "Guest",
                      car_type: car_type || "Sedan",
                      duration_days: duration_days || 3,
                      total: computedTotal
                    };

                    const output = {
                      status: "success",
                      action: "edit",
                      customer_name,
                      car_type,
                      duration_days,
                      additional_fee,
                      new_total: computedTotal,
                      message: `Successfully updated booking to a ${car_type} for ${duration_days} days. Previous total: $${prevTotal}. New total: $${computedTotal}. Additional charge is $${additional_fee}.`
                    };

                    functionResponses.push({
                      response: { output },
                      id: callId
                    });

                    clientWs.send(JSON.stringify({ calculation: output }));
                  }
                }

                // Resubmit the tool calculations back to Gemini Live
                await liveSession.sendToolResponse({ functionResponses });
              }
            }
          }
        }
      });

      // Catch inbound PCM audio stream from the client microphone
      clientWs.on("message", (buf: any) => {
        try {
          const data = JSON.parse(buf.toString());
          if (data.audio) {
            liveSession.sendRealtimeInput({
              audio: {
                data: data.audio,
                mimeType: "audio/pcm;rate=16000"
              }
            });
          }
        } catch (e) {
          // Fail-safe parse catch for buffer streams
        }
      });

      clientWs.on("close", () => {
        console.log("[Backend] Client closed voice portal websocket.");
        liveSession.close();
      });

    } catch (sessionErr) {
      console.error("[Backend] Error connecting to Gemini Live session:", sessionErr);
      clientWs.close();
    }
  });

  // Handle standard HTTP upgrades to WebSockets
  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
    if (pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (wsConnection) => {
        wss.emit("connection", wsConnection, request);
      });
    } else {
      socket.destroy();
    }
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://localhost:${PORT}`);
  });
}

startServer();
