import { GlobalHistory } from "@/models/interfaces";
import { Conversation } from "@grammyjs/conversations";
import { Context } from "grammy";

export async function priceConversation(
  conversation: Conversation,
  ctx: Context,
  getAllPrice: (
    conversation: Conversation<Context, Context>,
    ctx: Context,
    token: string
  ) => Promise<{
    success: boolean;
    error: any;
  }>
) {
  ctx.reply(`
Please enter the symbol of the asset you want to get the price for: \n 
APT, RION, MKL, BTC, ETH, etc ...`);

  const tkCtx = await conversation.waitFor("message:text");
  console.log("token", tkCtx.message.text.trim());
  await ctx.reply(`Fetching prices for the token ${tkCtx.message.text.trim()}`);

  await getAllPrice(conversation, ctx, tkCtx.message.text.trim());
}
