// server/sendOpenAuthPageButton.ts
import fetch from "node-fetch";
import type { SignAndSubmitParams } from "@/models/interfaces";

export async function sendOpenSignPageButton(
  chat_id: string,
  message: string,
  options: {
    text: string;
    web_app: {
      url: string;
    };
  }[]
) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const MINI_APP_BASE_URL = process.env.NEXT_PUBLIC_MINI_APP_BASE_URL;
  if (!BOT_TOKEN || !MINI_APP_BASE_URL) {
    throw new Error("Missing env: TELEGRAM_BOT_TOKEN or MINI_APP_BASE_URL");
  }

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({
      chat_id,
      parse_mode: "HTML",
      text: message,
      reply_markup: {
        inline_keyboard: [options],
      },
    }),
  });
}
