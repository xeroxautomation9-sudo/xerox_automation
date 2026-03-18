import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

export interface PrintIntent {
  color_mode?: 'bw' | 'color';
  copies?: number;
  page_range?: string;
  duplex?: boolean;
  binding?: string;
  urgency?: 'normal' | 'urgent';
  pickup_time?: string;
  confidence: number;
}

export async function parsePrintIntent(message: string, previousContext: string): Promise<PrintIntent> {
  const prompt = `
    You are an AI order parsing assistant for a Print Shop.
    Extract the print requirements from the customer's message.
    Previous context: "${previousContext}"
    Current message: "${message}"

    Respond ONLY with a JSON object. Ensure it is valid JSON. Use the following keys:
    - color_mode: "bw" or "color"
    - copies: number (default 1)
    - page_range: string (e.g., "1-5", "all")
    - duplex: boolean (true for double-sided, false for single-sided)
    - binding: string (e.g., "spiral", "hardcover", "none")
    - urgency: "normal" or "urgent"
    - pickup_time: string (e.g., "today 5pm")
    - confidence: number between 0 and 1 (1 being highly confident standard request)

    Example response:
    {
      "color_mode": "color",
      "copies": 2,
      "page_range": "all",
      "duplex": true,
      "binding": "none",
      "urgency": "normal",
      "pickup_time": "none",
      "confidence": 0.95
    }
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a parsing engine. Output ONLY JSON without markdown block format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama3-8b-8192',
      temperature: 0,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return {
      color_mode: parsed.color_mode,
      copies: parsed.copies,
      page_range: parsed.page_range,
      duplex: parsed.duplex,
      binding: parsed.binding,
      urgency: parsed.urgency,
      pickup_time: parsed.pickup_time,
      confidence: parsed.confidence || 0
    };
  } catch (error) {
    console.error('Groq parsing error:', error);
    return {
      confidence: 0
    };
  }
}
