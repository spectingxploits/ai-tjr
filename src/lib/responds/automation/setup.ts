import { getGatewayId } from "@/services/db/gateway";
import { type Conversation } from "@grammyjs/conversations";
import { Bot, type Context, InlineKeyboard } from "grammy";
import { checkAndFetchPhoneNumber } from "./contact";

/**
 * Ask the user to forward a message from the channel to automate,
 * wait for the forwarded message, extract source channel id and original message id,
 * then send a button linking to the original channel message.
 *
 * NOTE: we accept the `bot` instance to register a temporary listener safely.
 */
export async function respondSetupAutomationConversation(
  conversation: Conversation,
  ctx: Context
) {
  const fwd = ctx.message?.forward_origin;

  if (!fwd) {
    console.log("Message is not forwarded");
    return;
  }

  // Forwarded from a channel or group
  if (fwd.type === "channel") {
    const channelId = fwd.chat.id; // this is the channel/group ID

    const channelTitle = fwd.chat.title;
    await ctx.reply(
      `Detected channel ${channelTitle} 🤖
        please select an action to get the instruction for:`,
      {
        reply_markup: new InlineKeyboard()
          .text(
            "Automate",
            `automate_instructions:${channelId}_${channelTitle}`
          )
          .text(
            "Deactivate",
            `deactivate_instructions:${channelId}_${channelTitle}`
          ),
      }
    );
  }

  // Forwarded from a user
  if (fwd.type === "user") {
    ctx.reply("Forwarded messages from users are not supported !");
  }

  // Hidden forward (user privacy setting)
  if (fwd.type === "hidden_user") {
    ctx.reply("Forwarded messages from the hidden users are not supported !");
  }
}

export async function respondAutomate(
  conversation: Conversation,
  ctx: Context,
  channel_id: string
) {
  let forward_channel_id = null;
  try {
    forward_channel_id = await getGatewayId(String(ctx.chat!.id));
  } catch (e) {
    console.error("getGatewayId failed:", e);

    return;
  }
  let phone_number = await checkAndFetchPhoneNumber(conversation, ctx);
  if (!phone_number) return;

  if (!forward_channel_id) {
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

  const msg = `
<b>🚀 Follow the steps below to automate your channel:</b>

<b>1️⃣ Setup your Telefeed account</b>
   • Copy this message: <code>/connect ${phone_number}</code>  
   • start the <a href="https://t.me/tg_feedbot">Telefeed Bot</a> and pase what you copied above.  

<b>2️⃣ Create a new automation group</b>  
   • Copy this message and send it to <a href="https://t.me/tg_feedbot">Telefeed Bot</a>:  
   <code>/redirection add aitjrforw_${String(channel_id)
     .replace("-100", "")
     .slice(5)}_${String(forward_channel_id)
    .replace("-100", "")
    .slice(5)} on ${phone_number}</code>  

<b>3️⃣ Connect your channels</b>  
   • Copy this message and send it to <a href="https://t.me/tg_feedbot">Telefeed Bot</a>:  
   <code>${String(channel_id).replace("-100", "")} - ${String(
    forward_channel_id
  ).replace("-100", "")}</code>  

<b>4️⃣ 🎉 Congrats!</b>  
   Your automation is ready. Enjoy using <b>AI-TJR Bot 🤖</b>  
`;
  await ctx.reply(msg, { parse_mode: "HTML" });
}

export async function respondDeactivate(
  conversation: Conversation,
  ctx: Context,
  channel_id: string
) {
  let forward_channel_id = null;
  try {
    forward_channel_id = await getGatewayId(String(ctx.chat!.id));
  } catch (e) {
    console.error("getGatewayId failed:", e);

    return;
  }
  let phone_number = await checkAndFetchPhoneNumber(conversation, ctx);
  if (!phone_number) return;

  if (!forward_channel_id) {
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

  const msg = `
<b>⚡ Follow the steps below to deactivate channel automation:</b>

<b>1️⃣ Remove the automation group</b>  
   • Copy this message and send it to <a href="https://t.me/tg_feedbot">Telefeed Bot</a>:  
   <code>/redirection remove aitjrforw_${String(channel_id)
     .replace("-100", "")
     .slice(5)}_${String(forward_channel_id)
    .replace("-100", "")
    .slice(5)} on ${phone_number}</code>  
<b>2️⃣ Done!</b>  
   Your automations on <b>aitjrforwards</b> have been removed.  
   If you want automation again, you’ll need to set them up from scratch. 🔄
`;
  await ctx.reply(msg, { parse_mode: "HTML" });
}
