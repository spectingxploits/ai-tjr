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
): Promise<[GeminiResponse, string[]] | null> {
  try {
    //parsing the signal
    const output: string = await MakeGeminiRequest({
      message: GlobalPrompts.extractSignal,
      contents: rawText,
    });

    const parsedOutput: GeminiResponse = JSON.parse(
      output.replace(/```json|```/g, "").trim()
    ) as GeminiResponse;
    console.log("Gemini output:", output);

    if (parsedOutput.values == null || !parsedOutput.signalDetected) {
      return null;
    }
    const nullValues: string[] = [];

    Object.keys(parsedOutput.values).forEach((key) => {
      if (parsedOutput.values![key as keyof GlobalSignal] == null) {
        // Check for null or undefined
        nullValues.push(key);
      }
    });
    // wait for 3 seconds to avoid rate limit
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // getting the gemini opinion
    const geminiOpinion = await MakeGeminiRequestWithSearch({
      message: GlobalPrompts.feedback,
      contents: JSON.stringify(parsedOutput),
    });
    console.log("Gemini opinion:", geminiOpinion);
    let parsedGeminiOpinion: GeminiOpinion;
    try {
      parsedGeminiOpinion = JSON.parse(
        geminiOpinion.replace(/```json|```/g, "").trim()
      ) as GeminiOpinion;
      console.log("Gemini opinion:", parsedGeminiOpinion);
    } catch (e) {
      console.error("Gemini opinion parsing failed, retrying", e);
      const match = [
        ...geminiOpinion.matchAll(/\{[\s\S]*?successRate[\s\S]*?\}/g),
      ].pop();
      if (!match) {
        throw new Error("Gemini opinion parsing failed, no successRate found");
      }
      try {
        parsedGeminiOpinion = JSON.parse(match[0]);
      } catch {
        throw new Error("Gemini opinion parsing failed, no successRate found");
      }
    }

    // wait for 3 seconds to avoid rate limit
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // in this section we check the neseccary values that should have been filled by the raw signal and if they are present we fill them with the suggested values by gemini
    if (parsedOutput.values.enter == null) {
      return null; // catches both null and undefined
    }
    if (parsedOutput.values.long == null) {
      return null;
    }
    if (parsedOutput.values.symbol == null) {
      return null;
    }
    if (parsedOutput.values.lq == null) {
      parsedOutput.values.lq = 10;
    }

    // filling the null values with suggested values by gemini
    const geminiEnhancedOutput = await MakeGeminiRequestWithSearch({
      message: GlobalPrompts.fillParams,
      contents: JSON.stringify(parsedOutput),
    });

    console.log(geminiEnhancedOutput);

    const parsedGeminiEnhancedOutput: GeminiResponse = JSON.parse(
      geminiEnhancedOutput.replace(/```json|```/g, "").trim()
    ) as GeminiResponse;
    console.log("Gemini enhanced output:", parsedGeminiEnhancedOutput);

    if (parsedGeminiEnhancedOutput.values == null) {
      return null;
    }

    parsedGeminiEnhancedOutput.values!.aiDetectedSuccessRate =
      parsedGeminiOpinion.successRate;

    // filling the formatted text
    parsedGeminiEnhancedOutput.values!.text = formatGLobalSignal(
      parsedGeminiEnhancedOutput.values,
      nullValues
    );

    console.log("Gemini enhanced output:", parsedGeminiEnhancedOutput);

    if (parsedGeminiEnhancedOutput.values.lq == null) {
      parsedGeminiEnhancedOutput.values.lq = 10;
    }
    return [parsedGeminiEnhancedOutput, nullValues];
  } catch (e) {
    console.error("Gemini request failed:", e);
    return null;
  }
}
