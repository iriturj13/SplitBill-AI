import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ReceiptData, ReceiptItem, ChatResponse, PersonTotal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Prompt and Schema for Receipt Parsing
const RECEIPT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A unique short identifier for this item (e.g., '1', '2')" },
          name: { type: Type.STRING },
          price: { type: Type.NUMBER },
          quantity: { type: Type.NUMBER }
        },
        required: ["id", "name", "price", "quantity"]
      }
    },
    subtotal: { type: Type.NUMBER },
    tax: { type: Type.NUMBER },
    tip: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    currency: { type: Type.STRING, description: "Currency symbol, e.g., $, €, £" }
  },
  required: ["items", "subtotal", "total"]
};

// Prompt and Schema for Chat Commands
const CHAT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: "A brief, friendly confirmation of what was done." },
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          itemIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of item IDs to modify" },
          people: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of people names involved" },
          action: { type: Type.STRING, enum: ["assign", "unassign"] }
        },
        required: ["itemIds", "people", "action"]
      }
    }
  },
  required: ["reply", "assignments"]
};

export const parseReceiptImage = async (base64Image: string, mimeType: string): Promise<ReceiptData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this receipt. Extract all line items with their individual prices. Identify tax and tip if visible. If tip is not visible, set it to 0. Return a JSON object."
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as ReceiptData;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw error;
  }
};

export const processChatCommand = async (
  userMessage: string, 
  currentItems: ReceiptItem[],
  existingPeople: string[] = []
): Promise<ChatResponse> => {
  try {
    // We provide the current items context to the model so it can fuzzy match names
    const itemsContext = currentItems.map(item => `ID: ${item.id}, Name: ${item.name}, Price: ${item.price}`).join('\n');
    
    // Provide context about people already in the group to handle "everyone"
    const peopleContext = existingPeople.length > 0 
      ? existingPeople.join(', ') 
      : "No people assigned yet.";

    const prompt = `
      You are a smart bill splitter assistant.
      The user will give a command to assign items to people.
      
      Here is the list of available items on the receipt:
      ${itemsContext}

      Context - People already on the bill (use this list if user says 'everyone'):
      ${peopleContext}

      User Command: "${userMessage}"

      Instructions:
      1. Identify who the user is talking about.
      2. Match the user's description of items (e.g., "nachos", "pizza") to the specific Item IDs in the provided list. Be flexible with matching.
      3. If the user says "shared", it implies the item should be assigned to all mentioned people.
      4. SPECIAL RULE: If the user says "everyone", "all", "the group", or similar:
         - Assign the item(s) to ALL names listed in "Context - People already on the bill".
         - If the context is empty/unknown, try to infer names from the current command or ask for names.
      5. Return a JSON object containing a friendly reply and a list of assignment actions.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: CHAT_SCHEMA,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as ChatResponse;
  } catch (error) {
    console.error("Error processing chat command:", error);
    throw error;
  }
};

export const auditSplit = async (
  receiptData: ReceiptData,
  peopleTotals: PersonTotal[],
  unassignedItems: ReceiptItem[]
): Promise<string> => {
  try {
    const prompt = `
      You are an AI Bill Auditor. Review the current bill split for fairness, accuracy, and sanity.

      Receipt Overview:
      Subtotal: ${receiptData.subtotal}
      Tax: ${receiptData.tax}
      Tip: ${receiptData.tip}
      Total: ${receiptData.total}
      Currency: ${receiptData.currency}

      Current Assignments Breakdown:
      ${peopleTotals.map(p => `- ${p.name}: ${p.total.toFixed(2)} (Subtotal: ${p.subtotal.toFixed(2)}, Tax: ${p.tax.toFixed(2)}, Tip: ${p.tip.toFixed(2)}) - Items: ${p.items.length}`).join('\n')}

      Unassigned Items:
      ${unassignedItems.length > 0 ? unassignedItems.map(i => `- ${i.name} (${i.price})`).join('\n') : "None"}

      Please provide a brief, professional audit report in Markdown.
      
      Structure the report with these sections:
      1. **Unassigned Items Alert**: Alert if there are unassigned items.
      2. **Financial Reconciliation**: Verify if the sum of assignments matches the receipt total.
      3. **Distribution Analysis**: Comment on the spread. Identify "High Payers".
      4. **Logic Check**: Point out if someone has only paid for appetizers but no main, etc.
      
      If the split seems messy, you can suggest different ways to split (like Splitwise does), such as "Splitting shared items equally" or "Assigning by shares".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text || "Unable to generate audit report.";
  } catch (error) {
    console.error("Error auditing split:", error);
    throw error;
  }
};
