import { getGatewayId } from "@/services/db/gateway";
import { InlineKeyboard, Keyboard } from "grammy";

export async function respondAutomation(ctx: any) {
  // fetching the user gateway status
  const user_gateway_id = await getGatewayId(ctx.chat.id.toString());

  if (!user_gateway_id) {
    ctx.reply(
      `
⚠️ No gateway forwarding channel found.  

👉 Follow these steps to create one:

1️⃣ Create a new **Telegram Channel** from your account.  
2️⃣ Add **AI-TJR Bot** as an **Admin** of the channel.  

📌 **Important Notes:**  
- Do **not** add any other users to the channel.  
- Make sure the bot has **admin rights**.  

✅ Once that’s done, the bot will automatically detect it and guide you through the next steps.

    `
    );
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("Setup Automation", "setup_automation")
    .text("Remove Automation", "deactivate_automated_channel");

  new Keyboard().requestContact;

  ctx.reply(
    `
⚙️ You can either <b>set up a new automation</b> or <b>remove an existing automation</b> from your gateway channel.
    `,
    {
      reply_markup: keyboard,
      parse_mode: "HTML",
    }
  );
}
