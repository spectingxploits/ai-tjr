import { InlineKeyboard } from "grammy";
import { MESSAGES } from "../messages";

function openAuthKeyboard(chatId: string, connect: boolean) {
  return new InlineKeyboard().webApp(
    connect ? "Connect Wallet Page" : "Disconnect Wallet Page",
    `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/auth?ref=telegram&userId=${chatId}`
  );
}

export async function sendOpenAuthPageButton(
  ctx: any,
  connect: boolean,

  wallet: boolean
) {
  if (wallet) {
    // Build a single InlineKeyboard with two buttons
    const kb = new InlineKeyboard()
      .webApp(
        "Connect Wallet Page",
        `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/auth?ref=telegram&userId=${ctx.chat.id}`
      )
      .row()
      .webApp(
        "Disconnect Wallet Page",
        `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/auth?ref=telegram&userId=${ctx.chat.id}&action=disconnect`
      );

    await ctx.reply(MESSAGES.wallet, {
      parse_mode: "HTML",
      reply_markup: kb,
    });
  } else {
    // Single button
    const kb = openAuthKeyboard(String(ctx.chat.id), connect);
    await ctx.reply("Open Connect Wallet Page:", { reply_markup: kb });
  }
}
