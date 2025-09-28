import { Conversation } from "@grammyjs/conversations";
import { Keyboard, Context } from "grammy";

export async function checkAndFetchPhoneNumber(
  conversation: Conversation,
  ctx: Context
) {
  // if no message or no contact in this update
  const kb = new Keyboard()
    .requestContact("📱 share your phone number")
    .oneTime()
    .resized();

  const msg = `
✨ <b>AI-TJR Bot Request</b> ✨  

To enable channel automation, we need your phone number.  

📱 <i>Note:</i>  
• Your number is <b>never</b> stored or shared.  
• For privacy, we ask each time.  

👉 Tap the button below to share securely.
`;
  await ctx.reply(msg, { parse_mode: "HTML", reply_markup: kb });

  const { message } = await conversation.waitFor("msg:contact");

  console.log("message", message);
  if (!message?.contact.phone_number) {
    ctx.reply(`sharing phone num ber failed, plz try again`);
    return null;
  } else {
    return message?.contact.phone_number.replace("+", "");
  }
}
