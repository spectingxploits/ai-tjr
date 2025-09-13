import { GeminiRequestOptions } from "@/models/interfaces";
import { GoogleGenAI } from "@google/genai";

export async function MakeGeminiRequestWithSearch(
  options: GeminiRequestOptions
): Promise<string> {
  // The client gets the API key from the environment variable `GEMINI_API_KEY`.
  const ai = new GoogleGenAI({});

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: options.message + options.contents,
    config: {
      tools: [
        {
          googleSearch: {},
        },
      ],
    },
  });

  if (!response.text) throw new Error("No response from Gemini API");

  return response.text;
}

export async function MakeGeminiRequest(
  options: GeminiRequestOptions
): Promise<string> {
  // The client gets the API key from the environment variable `GEMINI_API_KEY`.
  const ai = new GoogleGenAI({});

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: options.message + options.contents,
  });

  if (!response.text) throw new Error("No response from Gemini API");

  return response.text;
}
