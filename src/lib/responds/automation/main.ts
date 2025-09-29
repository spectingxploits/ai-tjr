import { getGatewayId } from "@/services/db/gateway";
import { InlineKeyboard, Keyboard } from "grammy";
import { MESSAGES } from "../messages";

export async function respondAutomation(ctx: any) {
  // fetching the user gateway status
  const user_gateway_id = await getGatewayId(ctx.chat.id.toString());

  if (!user_gateway_id) {
    ctx.reply(MESSAGES.no_gateway_found, { parse_mode: "HTML" });
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
