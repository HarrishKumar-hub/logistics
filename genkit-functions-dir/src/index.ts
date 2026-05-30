/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { z } from "zod";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { db } from "./firebase";

setGlobalOptions({ maxInstances: 10 });

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
});

// Tool definition for updating trip status
const updateTripStatusTool = ai.defineTool(
  {
    name: "updateTripStatus",
    description: "Updates the logistics database with the current status and location of the tipper truck.",
    inputSchema: z.object({
      tripId: z.string(),
      status: z.enum(["IN_TRANSIT", "DELAYED", "BROKEN_DOWN", "DELIVERED"]),
      reason: z.string().describe("A short explanation for the dispatcher notes"),
      lat: z.number().describe("The estimated latitude coordinate of the location mentioned"),
      lng: z.number().describe("The estimated longitude coordinate of the location mentioned"),
    }),
  },
  async (input) => {
    console.log(`[TOOL EXECUTION] Updating Trip ${input.tripId}:`, input);
    
    try {
      // Update Firestore with the new status and AI reasoning
      await db.collection('trips').doc(input.tripId).set({
        status: input.status,
        statusReason: input.reason,
        lat: input.lat,
        lng: input.lng,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      return { success: true, message: `Trip ${input.tripId} status updated to ${input.status}` };
    } catch (error) {
      console.error("Tool execution error:", error);
      return { success: false, message: "Failed to update database" };
    }
  }
);

export const processwhatsappmessage = onRequest({ cors: true }, async (req, res) => {
  // Simple check for JSON body
  const { tripId, message } = req.body;

  if (!tripId || !message) {
    res.status(400).json({ error: "Missing tripId or message in request body" });
    return;
  }

  try {
    console.log(`Processing message for trip ${tripId}: ${message}`);

    // 3. AI Direct Execution with Spatial Awareness
    const { text } = await ai.generate({
      model: "googleai/gemini-2.5-flash",
      prompt: `You are an expert AI logistics dispatcher for TST Fleet Management, tracking 6-wheel tipper trucks operating primarily around Sankari, Salem, and major Tamil Nadu highways.
      The driver for trip ID ${tripId} just sent this message: "${message}".

      INSTRUCTIONS:
      1. Analyze the message to determine the operational status (e.g., DELAYED, BROKEN_DOWN).
      2. Identify any location mentioned (e.g., "Sankari toll plaza", "Erode", "Salem steel plant").
      3. Use your internal knowledge to estimate the exact GPS coordinates (Latitude and Longitude) for that location.
      4. You MUST use the 'updateTripStatus' tool to record the status, reason, and estimated coordinates into the database.
      5. Your final text output must ONLY be a short, professional, and reassuring text reply to the driver. DO NOT output numbered lists or your internal reasoning.`,
      tools: [updateTripStatusTool],
    });

    res.json({
      status: "processed",
      tripId,
      originalMessage: message,
      analysis: text,
      processedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Genkit Error:", error);
    res.status(500).json({ 
      error: "AI Processing Failed", 
      details: error.message 
    });
  }
});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
