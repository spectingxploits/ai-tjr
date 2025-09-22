import { GlobalSignal } from "@/models/interfaces";

export function formatGLobalSignal(
  signal: GlobalSignal,
  ai_items: string[] = []
): string {
  return `
---

🚪 Enter: ${signal.enter} ${ai_items.includes("enter") ? "AI Suggest 🤖" : ""}
💰 Profit: ${signal.profit}% ${
    ai_items.includes("profit") ? "AI Suggest 🤖" : ""
  }
📉 Loss: ${signal.loss}% ${ai_items.includes("loss") ? "AI Suggest 🤖" : ""}
🎯 TP (Take Profit): ${signal.tp} ${
    ai_items.includes("tp") ? "AI Suggest 🤖" : ""
  }
🚫 SL (Stop Loss): ${signal.sl} ${
    ai_items.includes("sl") ? "AI Suggest 🤖" : ""
  }
💧 LQ (Liquidity): ${signal.lq} ${
    ai_items.includes("lq") ? "AI Suggest 🤖" : ""
  }
⚖️ Leverage: ${signal.leverage} ${
    ai_items.includes("leverage") ? "AI Suggest 🤖" : ""
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
