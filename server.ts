import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Email confirmation endpoint
  app.post("/api/email/send-confirmation", async (req, res) => {
    try {
      const { customerEmail, customerName, reservationId, vehicleName, pickupDate, returnDate, totalAmount, logo, customMessage, signature, businessInfo } = req.body;
      const logoUrl = logo || "https://i.imgur.com/NMk2vsy.png";
      
      let formattedMsg = customMessage || "Thank you for choosing Rent A.i. Your vehicle is ready and your reservation is confirmed.";
      formattedMsg = formattedMsg
        .replace(/{{customer_name}}/g, customerName || "")
        .replace(/{{vehicle}}/g, vehicleName || "")
        .replace(/{{pickup_date}}/g, pickupDate || "")
        .replace(/{{return_date}}/g, returnDate || "")
        .replace(/{{total_cost}}/g, totalAmount ? `$${totalAmount}` : "");

      // If we don't have SMTP credentials, we just simulate the email
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[Email Simulation] Sent booking confirmation to ${customerEmail}`);
        console.log(`Reservation ${reservationId} for ${vehicleName} | Total: $${totalAmount}`);
        return res.json({ success: true, simulated: true });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Rent A.i." <no-reply@rentai.com>',
        to: customerEmail,
        subject: `Reservation Confirmed - Booking #${reservationId.slice(0, 6).toUpperCase()}`,
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px;">
              <img src="${logoUrl}" alt="Logo" style="max-height: 70px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; object-fit: contain;" />
              <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800; tracking-tight: -0.025em; text-transform: uppercase;">${businessInfo || 'Rent A.i.'}</h1>
              <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px; font-weight: 500;">Booking Confirmation</p>
            </div>
            
            <h2 style="color: #1e3a8a; margin-top: 0; font-size: 18px; font-weight: 700;">Booking Confirmed, ${customerName}!</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line;">${formattedMsg}</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 24px 0;">
              <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Reservation Details</h3>
              <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse; line-height: 1.8;">
                <tr>
                  <td style="padding: 6px 0; font-weight: 600;">Vehicle:</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 700;">${vehicleName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600;">Pickup Date:</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a;">${pickupDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600;">Return Date:</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a;">${returnDate}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0 0 0; font-weight: 700; color: #0f172a; font-size: 14px;">Total Cost:</td>
                  <td style="padding: 10px 0 0 0; text-align: right; color: #1e3a8a; font-weight: 800; font-size: 16px;">$${totalAmount}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #475569; font-size: 14px; line-height: 1.6; white-space: pre-line;">${signature || 'Best regards,\nThe Rent A.i. Team'}</p>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0;">Need to make changes? You can call our AI Voice assistant anytime to modify your booking instantly.</p>
              <p style="margin: 8px 0 0 0;">&copy; 2026 ${businessInfo || 'Rent A.i.'}. All rights reserved.</p>
            </div>
          </div>
        `,
      });
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("[Email Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Email agreement endpoint
  app.post("/api/email/send-agreement", async (req, res) => {
    try {
      const { customerEmail, customerName, reservationId, vehicleName, pickupDate, returnDate, agreementText, logo, businessInfo, signature } = req.body;
      const logoUrl = logo || "https://i.imgur.com/NMk2vsy.png";
      
      // If we don't have SMTP credentials, we just simulate the email
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[Email Simulation] Sent rental agreement to ${customerEmail}`);
        console.log(`Reservation ${reservationId} for ${vehicleName} | Agreement Preview: ${agreementText ? agreementText.slice(0, 100) : ''}...`);
        return res.json({ success: true, simulated: true });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Rent A.i." <no-reply@rentai.com>',
        to: customerEmail,
        subject: `Rental Agreement for Booking #${reservationId.slice(0, 6).toUpperCase()}`,
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 650px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px;">
              <img src="${logoUrl}" alt="Logo" style="max-height: 70px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; object-fit: contain;" />
              <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800; tracking-tight: -0.025em; text-transform: uppercase;">${businessInfo || 'Rent A.i.'}</h1>
              <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px; font-weight: 500;">Official Rental Agreement & Contract</p>
            </div>
            
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; font-weight: 500;">Dear <strong>${customerName}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
              Please review and sign the official rental agreement contract for your upcoming booking <strong>#${reservationId.slice(0, 8).toUpperCase()}</strong>.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 24px 0;">
              <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Booking Summary</h3>
              <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse; line-height: 1.8;">
                <tr>
                  <td style="padding: 4px 0; font-weight: 600;">Vehicle:</td>
                  <td style="padding: 4px 0; text-align: right; color: #0f172a; font-weight: 700;">${vehicleName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: 600;">Pickup Date:</td>
                  <td style="padding: 4px 0; text-align: right; color: #0f172a;">${pickupDate}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: 600;">Return Date:</td>
                  <td style="padding: 4px 0; text-align: right; color: #0f172a;">${returnDate}</td>
                </tr>
              </table>
            </div>

            <div style="margin: 24px 0;">
              <h3 style="color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">Terms & Conditions</h3>
              <div style="background-color: #fafafa; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; font-size: 12px; color: #334155; max-height: 350px; overflow-y: auto; line-height: 1.6; white-space: pre-wrap; font-family: 'Inter', sans-serif;">
                ${agreementText || 'Standard vehicle rental terms apply.'}
              </div>
            </div>

            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <div style="display: flex; gap: 20px;">
                <div style="flex: 1; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align: center;">
                  <p style="font-family: serif; font-style: italic; font-size: 16px; color: #1e3a8a; margin: 0 0 4px 0; font-weight: 600;">${customerName}</p>
                  <p style="font-weight: 700; font-size: 11px; color: #475569; margin: 0;">Lessee Signature</p>
                  <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">Digitally Logged & Verified</p>
                </div>
                <div style="flex: 1; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align: center;">
                  <p style="font-size: 13px; color: #475569; margin: 0 0 4px 0; font-weight: 600;">Authorized Agent #SW-${reservationId.substring(0, 4).toUpperCase()}</p>
                  <p style="font-weight: 700; font-size: 11px; color: #475569; margin: 0;">Authorized Officer Signature</p>
                  <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">System logged on ${new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-top: 24px; white-space: pre-line;">
              ${signature || 'Best regards,\nThe Rent A.i. Team'}
            </p>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0;">This agreement constitutes a binding digital lease contract between the lessee and ${businessInfo || 'Rent A.i.'}.</p>
              <p style="margin: 8px 0 0 0;">&copy; 2026 ${businessInfo || 'Rent A.i.'}. All rights reserved.</p>
            </div>
          </div>
        `,
      });
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("[Email Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chatbot endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages.map((m: any) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }))
      });
      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // OCR Driver's License endpoint
  app.post("/api/ocr-license", async (req, res) => {
    try {
      const { base64Image, mimeType } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "No image provided." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const imagePart = {
        inlineData: {
          data: base64Image.split(",")[1] || base64Image,
          mimeType: mimeType || "image/jpeg",
        },
      };

      const textPart = {
        text: "Extract the driver's first name, last name, driver's license/licence number, and the expiration date from the provided driver's license image. If a field is not found or cannot be read, return an empty string.",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              firstName: {
                type: Type.STRING,
                description: "The extracted first name (given name) of the driver. Return empty string if not found or unreadable.",
              },
              lastName: {
                type: Type.STRING,
                description: "The extracted last name (family name/surname) of the driver. Return empty string if not found or unreadable.",
              },
              driverLicenseNumber: {
                type: Type.STRING,
                description: "The extracted Driver's License or Licence number. Return empty string if not found or unreadable.",
              },
              driverLicenseExpiration: {
                type: Type.STRING,
                description: "The extracted expiration date of the driver's license in YYYY-MM-DD format. Return empty string if not found or unreadable.",
              },
            },
            required: ["firstName", "lastName", "driverLicenseNumber", "driverLicenseExpiration"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Failed to extract data from image.");
      }

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (e: any) {
      console.error("[OCR License Error]", e);
      res.status(500).json({ error: e.message });
    }
  });

  // AI Chatbot endpoint
  app.post("/api/voice-agent", async (req, res) => {
    try {
      const { text, sessionState } = req.body;
      console.log(`[Backend-Voice] Received text: "${text}"`);
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const rates: Record<string, number> = {
        sedan: 50, suv: 90, truck: 110, coupe: 80, premium: 150, electric: 100, van: 120
      };

      const systemInstruction = `You are an elite, warm, friendly, brief, and highly conversational voice receptionist for "Philly Car Rental" agency.
Your primary objective is to extract the Customer Name and requested Vehicle Class Category (Sedan, SUV, Truck, Coupe, Premium, Electric, Van).
Keep every response to 1-2 sentence maximum. Be extremely brief, crisp, and speak casually like a high-end receptionist. Never use Markdown.
If the user wants to book or edit a reservation, use the tools. When the tool returns, explain the final cost conversationally.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: "Understood." }] },
          { role: 'user', parts: [{ text }] }
        ],
        config: {
          tools: [
            {
              functionDeclarations: [
                {
                  name: "book_appointment",
                  description: "Creates or books a new car rental slot",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      customer_name: { type: Type.STRING },
                      car_type: { type: Type.STRING },
                      duration_days: { type: Type.INTEGER }
                    },
                    required: ["customer_name", "car_type", "duration_days"]
                  }
                },
                {
                  name: "edit_appointment",
                  description: "Modifies an existing car rental slot",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      customer_name: { type: Type.STRING },
                      car_type: { type: Type.STRING },
                      duration_days: { type: Type.INTEGER }
                    },
                    required: ["customer_name", "car_type", "duration_days"]
                  }
                }
              ]
            }
          ]
        }
      });
      

      console.log(`[Backend-Voice] Gemini Response Text: "${response.text}"`);

      let calculation = null;
      const toolCall = response.functionCalls?.[0];
      
      let finalSpeech = response.text || "";

      if (toolCall) {
        const { name, args } = toolCall;
        const { customer_name, car_type, duration_days } = args as any;
        const rType = (car_type || "Sedan").toLowerCase();
        const rate = rates[rType] || 50;
        const computedTotal = rate * (duration_days || 3);
        
        if (name === "book_appointment") {
          calculation = {
            action: "book",
            customer_name, car_type, duration_days,
            additional_fee: 0, new_total: computedTotal
          };
          finalSpeech = response.text || `Okay ${customer_name}, I've booked a ${car_type} for ${duration_days} days. Your total is $${computedTotal}. I have updated the board!`;
        } else if (name === "edit_appointment") {
          const prevTotal = sessionState?.total || 0;
          const additional_fee = Math.max(0, computedTotal - prevTotal);
          calculation = {
            action: "edit",
            customer_name, car_type, duration_days,
            additional_fee, new_total: computedTotal
          };
          finalSpeech = response.text || `Got it ${customer_name}, I've upgraded you to a ${car_type}. Your new total is $${computedTotal}, which adds an additional $${additional_fee}.`;
        }

        // Ideally we'd loop back to Gemini with the tool output to get natural speech, 
        // but for simplicity we provide fallback speech if the model didn't provide text alongside the tool call.
        if (!response.text) {
          const secondResponse = await ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'model', parts: [{ text: "Understood." }] },
                { role: 'user', parts: [{ text }] },
                { role: 'model', parts: [{ functionCall: toolCall }] },
                { role: 'user', parts: [{ functionResponse: { name, response: { result: "Success calculated", ...calculation } } }] }
             ]
          });
          finalSpeech = secondResponse.text || finalSpeech;
        }
      }

      res.json({ speech: finalSpeech, calculation });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
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
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
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
