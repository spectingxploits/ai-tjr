import { GlobalSignal } from "@/models/interfaces";

export function formatGLobalSignal(
  signal: GlobalSignal,
  ai_items: string[] = []
): string {
  // Helper to append AI badge if needed
  const aiBadge = (key: string) =>
    ai_items.includes(key) ? " 🤖 AI Detect" : "";

  // AI success rate color
  const aiRateColor =
    Number(signal.aiDetectedSuccessRate) > 80
      ? "🟢"
      : Number(signal.aiDetectedSuccessRate) > 50
      ? "🟠"
      : Number(signal.aiDetectedSuccessRate) < 50
      ? "🔴"
      : "🟡";

  // Side emoji
  const sideEmoji = signal.long ? "⬆️ Long" : "⬇️ Short";

  return `
════════════════════
💹 <b>${signal.market ? "Market" : "Limit"} Signal Detected</b>
════════════════════

🚪 <b>Enter:</b> ${signal.enter}${aiBadge("enter")}
💰 <b>Profit:</b> ${signal.profit}%${aiBadge("profit")}
📉 <b>Loss:</b> ${signal.loss}%${aiBadge("loss")}
🎯 <b>TP:</b> ${signal.tp}${aiBadge("tp")}
🚫 <b>SL:</b> ${signal.sl}${aiBadge("sl")}
💧 <b>Liquidity:</b> ${signal.lq}${aiBadge("lq")}
⚖️ <b>Leverage:</b> ${signal.leverage}${aiBadge("leverage")}
📊 <b>Side:</b> ${sideEmoji}${aiBadge("long")}
🔤 <b>Symbol:</b> ${signal.symbol}${aiBadge("symbol")}
🤖 <b>AI Success Rate:</b> ${signal.aiDetectedSuccessRate}% ${aiRateColor}

${
  signal.reasons && signal.reasons.length > 0
    ? `💡 <b>Reasons:</b>\n• ${signal.reasons.join("\n• ")}`
    : ""
}
════════════════════
`;
}

// export function formatGlobalSignalWithDiff(
//   // prevText: string,
//   newSignal: GlobalSignal, 
//   ai_items: string[]
// ): string {
//   const fieldPatterns: Record<string, RegExp> = {
//     enter: /🚪 <b>Enter:<\/b> ([^🤖\n]+)( 🤖 AI Detect)?/,
//     profit: /💰 <b>Profit:<\/b> ([^%]+)%?( 🤖 AI Detect)?/,
//     loss: /📉 <b>Loss:<\/b> ([^%]+)%?( 🤖 AI Detect)?/,
//     tp: /🎯 <b>TP:<\/b> ([^🤖\n]+)( 🤖 AI Detect)?/,
//     sl: /🚫 <b>SL:<\/b> ([^🤖\n]+)( 🤖 AI Detect)?/,
//     lq: /💧 <b>Liquidity:<\/b> ([^🤖\n]+)( 🤖 AI Detect)?/,
//     leverage: /⚖️ <b>Leverage:<\/b> ([^🤖\n]+)( 🤖 AI Detect)?/,
//     long: /📊 <b>Side:<\/b> ([^🤖\n]+)( 🤖 AI Detect)?/,
//     symbol: /🔤 <b>Symbol:<\/b> ([^🤖\n]+)( 🤖 AI Detect)?/,
//   };

//   // Extract which fields had AI badges before
//   const prevAiItems: string[] = [];
//   for (const [key, regex] of Object.entries(fieldPatterns)) {
//     const match = prevText.match(regex);
//     if (match?.[2]) prevAiItems.push(key);
//   }

//   // Format the new signal WITHOUT ai_items
//   const newTextRaw = formatGLobalSignal(newSignal, []);

//   // Now rebuild the AI badges based on diff
//   let finalText = newTextRaw;

//   for (const [key, regex] of Object.entries(fieldPatterns)) {
//     const prevMatch = prevText.match(regex);
//     const newMatch = newTextRaw.match(regex);

//     if (!prevMatch || !newMatch) continue;

//     const prevValue = prevMatch[1].trim();
//     const newValue = newMatch[1].trim();
//     const hadAi = prevAiItems.includes(key);

//     // If value changed → remove AI badge
//     if (prevValue !== newValue) {
//       finalText = finalText.replace(
//         regex,
//         (_, val) => `${regex.source.includes("%") ? val + "%" : val}`
//       );
//     }
//     // If value unchanged and had AI badge → re-add AI badge
//     else if (hadAi) {
//       finalText = finalText.replace(
//         regex,
//         (_full, val) =>
//           `${regex.source.includes("%") ? val + "%" : val} 🤖 AI Detect`
//       );
//     }
//   }

//   return finalText;
// }
