import { GlobalSignal } from "@/models/interfaces";
import { getPendingEdit, savePendingEdit } from "@/lib/sessionStore";
import { formatGLobalSignal } from "@/lib/helpers/formatter";
export async function respondEditAndConfirm(
  user_chat_id: string,
  signal: GlobalSignal,
  ai_items: string[]
): Promise<void> {
  try {
    const combined = { signal, ai_items, createdAt: Date.now() };
    const token = Date.now().toString(36);
    savePendingEdit(String(token), combined);
    console.log(
      "edit and confirm token",
      String(token),
      "data",
      getPendingEdit(token)
    );
    // Plain reply keyboard (pressing a button sends a normal message to the bot)
    const inline_keyboard = [
      [
        { text: "✏️ Edit Signal", callback_data: `edit_signal:${token}` },
        { text: "✅ Confirm", callback_data: `confirm_signal:${token}` },
      ],
    ];

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");

    let res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user_chat_id,
          parse_mode: "HTML",
          text: signal.text,
          reply_markup: {
            inline_keyboard,
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        }),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("Telegram API error:", data);
    } else {
      console.log("Telegram API success:", data);
    }
  } catch (e) {
    console.error("sendEditAndConfirm failed:", e);
    throw e;
  }
}

export async function editToEditAndConfirmExt(
  ctx: any,
  signal: GlobalSignal,
  ai_items: string[],
  chatId: string,
  messageId: string,
  token: string
) {
  const inline_keyboard = [
    [
      { text: "✏️ Edit Signal", callback_data: `edit_signal:${token}` },
      { text: "✅ Confirm", callback_data: `confirm_signal:${token}` },
    ],
  ];
  const formatted = formatGLobalSignal(signal, ai_items);
  try {
    await ctx.api.editMessageText(chatId, Number(messageId), formatted, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard,
      },
    });
  } catch (e) {
    // ignore edit errors (e.g. message deleted) but at least log
    console.warn("update to edit and confirm failed:", e);
  }
}
