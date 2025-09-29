import { getGatewayId } from "@/services/db/gateway";
import { type Conversation } from "@grammyjs/conversations";
import { type Context, InlineKeyboard } from "grammy";
import { checkAndFetchPhoneNumber } from "../contact";
import { MESSAGES } from "../messages";

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
  const phone_number = await checkAndFetchPhoneNumber(conversation, ctx);
  if (!phone_number) return;

  if (!forward_channel_id) {
    ctx.reply(MESSAGES.no_gateway_found, { parse_mode: "HTML" });
    return;
  }

  const msg = MESSAGES.automate_instructions(
    phone_number,
    channel_id,
    forward_channel_id
  );
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
  const phone_number = await checkAndFetchPhoneNumber(conversation, ctx);
  if (!phone_number) return;

  if (!forward_channel_id) {
    ctx.reply(MESSAGES.no_gateway_found, { parse_mode: "HTML" });
    return;
  }

  const msg = MESSAGES.deactivate_instructions(
    channel_id,
    forward_channel_id,
    phone_number
  );
  await ctx.reply(msg, { parse_mode: "HTML" });
}
