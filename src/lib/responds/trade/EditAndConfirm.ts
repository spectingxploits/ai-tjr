import { GlobalSignal } from "@/models/interfaces";
import { InlineKeyboard } from "grammy";

export async function respondEditAndConfirm(
  user_chat_id: string,
  signal: GlobalSignal,
  ai_items: string[]
): Promise<void> {
  // fetching the user gateway status
  const combined = { ai_items, signal };
  console.log("combined", combined, user_chat_id);
  const keyboard = new InlineKeyboard()
    .text("Edit Signal", `edit_signal:${JSON.stringify(combined)}`)
    .text("Confirm", `confirm_signal:${JSON.stringify(combined)}`);

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const MINI_APP_BASE_URL = process.env.NEXT_PUBLIC_MINI_APP_BASE_URL;
  if (!BOT_TOKEN || !MINI_APP_BASE_URL) {
    throw new Error("Missing env: TELEGRAM_BOT_TOKEN or MINI_APP_BASE_URL");
  }

  if (signal.text == null) {
    throw new Error("signal.text is null");
  }
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({
      user_chat_id,
      parse_mode: "HTML",
      text: signal.text,
      reply_markup: {
        inline_keyboard: [keyboard],
      },
    }),
  });
  return;
}
