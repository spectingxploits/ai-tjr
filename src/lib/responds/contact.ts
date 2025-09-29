import { Conversation } from "@grammyjs/conversations";
import { Keyboard, Context } from "grammy";
import { mainMenu } from "./startRespond";
import { MESSAGES } from "./messages";

export async function checkAndFetchPhoneNumber(
  conversation: Conversation,
  ctx: Context
) {
  // if no message or no contact in this update
  const kb = new Keyboard()
    .requestContact("📱 share your phone number")
    .oneTime()
    .resized();

  const msg = MESSAGES.contact_request;

  await ctx.reply(msg, { parse_mode: "HTML", reply_markup: kb });

  const { message } = await conversation.waitFor("msg:contact");

  if (!message?.contact.phone_number) {
    ctx.reply(` ❌ sharing phone num ber failed, plz try again`, {
      reply_markup: mainMenu,
    });
    return null;
  } else {
    await ctx.reply("✅ Thanks, got your number!", {
      reply_markup: mainMenu,
    });
    return message?.contact.phone_number.replace("+", "");
  }
}
