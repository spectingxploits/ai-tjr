import { GlobalPrompts } from "@/models/GlobalPrompts";
import {
  GeminiOpinion,
  GeminiResponse,
  GlobalSignal,
} from "@/models/interfaces";
import {
  MakeGeminiRequest,
  MakeGeminiRequestWithSearch,
} from "@/services/core/geminiRequest";
import { formatGLobalSignal } from "./formatter";

export async function parseRawPotentialSignal(
  rawText: string
): Promise<GeminiResponse | null> {
  try {
    //parsing the signal
    let output: string = await MakeGeminiRequest({
      message: GlobalPrompts.extractSignal,
      contents: rawText,
    });

    let parsedOutput: GeminiResponse = JSON.parse(
      output.replace(/```json|```/g, "").trim()
    ) as GeminiResponse;
    console.log("Gemini output:", output);

    if (parsedOutput.values == null || !parsedOutput.signalDetected) {
      return parsedOutput;
    }
    let nullValues: string[] = [];

    Object.keys(parsedOutput.values).forEach((key) => {
      if (parsedOutput.values![key as keyof GlobalSignal] == null) {
        // Check for null or undefined
        nullValues.push(key);
      }
    });
    // wait for 3 seconds to avoid rate limit
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // getting the gemini opinion
    let geminiOpinion = await MakeGeminiRequestWithSearch({
      message: GlobalPrompts.feedback,
      contents: JSON.stringify(parsedOutput),
    });
    let parsedGeminiOpinion: GeminiOpinion = JSON.parse(
      geminiOpinion.replace(/```json|```/g, "").trim()
    ) as GeminiOpinion;
    console.log("Gemini opinion:", parsedGeminiOpinion);

    // wait for 3 seconds to avoid rate limit
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // filling the null values with suggested values by gemini
    let geminiEnhancedOutput = await MakeGeminiRequestWithSearch({
      message: GlobalPrompts.fillParams,
      contents: JSON.stringify(parsedOutput),
    });
    let parsedGeminiEnhancedOutput: GeminiResponse = JSON.parse(
      geminiEnhancedOutput.replace(/```json|```/g, "").trim()
    ) as GeminiResponse;
    console.log("Gemini enhanced output:", parsedGeminiEnhancedOutput);

    if (parsedGeminiEnhancedOutput.values == null) {
      return parsedGeminiEnhancedOutput;
    }

    parsedGeminiEnhancedOutput.values!.aiDetectedSuccessRate =
      parsedGeminiOpinion.successRate;

    // filling the formatted text
    parsedGeminiEnhancedOutput.values!.text = formatGLobalSignal(
      parsedGeminiEnhancedOutput.values,
      nullValues
    );

    console.log("Gemini enhanced output:", parsedGeminiEnhancedOutput);

    return parsedGeminiEnhancedOutput;
  } catch (e) {
    console.error("Gemini request failed:", e);
    return null;
  }
}
