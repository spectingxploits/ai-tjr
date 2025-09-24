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
