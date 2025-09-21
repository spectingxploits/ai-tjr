export async function sendOpenTxConfirmPage(chat_id: string, payload: string) {
  // using node fetch or a Telegram library on your server-side webhook handler
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat_id,
      text: "Confirm Transaction",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Confirm Transaction",
              web_app: {
                url: `${process.env.MINI_APP_BASE_URL}/confirm?ref=telegram&payload=${payload}`,
              },
            },
          ],
        ],
      },
    }),
  });
}
