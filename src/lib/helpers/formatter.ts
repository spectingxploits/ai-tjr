import { GlobalSignal } from "@/models/interfaces";

export function formatGLobalSignal(
  signal: GlobalSignal,
  ai_items: string[] = []
): string {
  return `
---

  ${signal.market ? "📈 Market 📉" : "🔥 Limit 🔥"} Signal Detected
🚪 Enter: ${signal.enter} ${ai_items.includes("enter") ? "AI Detect 🤖" : ""}
💰 Profit: ${signal.profit}% ${
    ai_items.includes("profit") ? "AI Detect 🤖" : ""
  }
📉 Loss: ${signal.loss}% ${ai_items.includes("loss") ? "AI Detect 🤖" : ""}
🎯 TP (Take Profit): ${signal.tp} ${
    ai_items.includes("tp") ? "AI Detect 🤖" : ""
  }
🚫 SL (Stop Loss): ${signal.sl} ${ai_items.includes("sl") ? "AI Detect 🤖" : ""}
💧 LQ (Liquidity): ${signal.lq} ${ai_items.includes("lq") ? "AI Detect 🤖" : ""}
⚖️ Leverage: ${signal.leverage} ${
    ai_items.includes("leverage") ? "AI Detect 🤖" : ""
  }
📊 Side: ${signal.long ? "Long ⬆️" : "Short ⬇️"} ${
    ai_items.includes("long") ? "AI" : ""
  }
🔤 Symbol: ${signal.symbol} ${ai_items.includes("symbol") ? "AI" : ""}      
📈 AI Detected Success Rate: ${signal.aiDetectedSuccessRate}% ${
    Number(signal.aiDetectedSuccessRate) > 80
      ? "🟢"
      : Number(signal.aiDetectedSuccessRate) > 50
      ? "🟠"
      : Number(signal.aiDetectedSuccessRate) < 50
      ? "🔴"
      : "🟡"
  }

---

    `;
}
