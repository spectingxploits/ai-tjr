// server/sendOpenAuthPageButton.ts
import fetch from "node-fetch";
import type { SignAndSubmitParams } from "@/models/interfaces";

export async function sendOpenAuthPageButton(
  chat_id: string,
  params: SignAndSubmitParams
) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const MINI_APP_BASE_URL = process.env.MINI_APP_BASE_URL;
  if (!BOT_TOKEN || !MINI_APP_BASE_URL) {
    throw new Error("Missing env: TELEGRAM_BOT_TOKEN or MINI_APP_BASE_URL");
  }

  // create a wrapper that includes the chat id so the mini app can display/use it
  const wrapper = {
    ...params,
    telegramChatId: String(chat_id), // added field
  };

  // encode the wrapper for safe URL transport
  const encoded = encodeURIComponent(JSON.stringify(wrapper));

  const webAppUrl = `${MINI_APP_BASE_URL}/trade/sign?payload=${encoded}`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text: "Please review and confirm the transaction",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open transaction preview",
              web_app: {
                url: webAppUrl,
              },
            },
          ],
        ],
      },
    }),
  });
}
