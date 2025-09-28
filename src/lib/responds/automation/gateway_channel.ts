import { InlineKeyboard } from "grammy";

export async function respondChannelUpdates(
  added: boolean,
  chat_id: string,
  channel_name: string
) {
  if (added) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat_id,
        text: `✅ Connected to channel "${channel_name}" as forwarding gateway`,
      }),
    });
  } else {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat_id,
        text: `❌ Disconnected from channel "${channel_name}"`,
      }),
    });
  }
}
