import { InlineKeyboard, Keyboard } from "grammy";
import { MESSAGES } from "./messages";

export const mainMenu = new Keyboard()
  .text("💼 Wallet") // → /wallet
  .text("⚡ Automation") // → /automation
  .row()
  .text("📊 Trade") // → /trade
  .text("❓ Help") // → /help
  .resized()
  .persistent();

export async function respondStartMessage(ctx: any) {
  const inlineMenu = new InlineKeyboard()
    .text("💼 Wallet", "💼 Wallet") // → /wallet
    .text("⚡ Automation", "⚡ Automation") // → /automation
    .row()
    .text("📊 Trade", "📊 Trade") // → /trade
    .text("❓ Help", "❓ Help"); // → /help

  await ctx.reply(
    `
🤖 <b>Hello! I am AI_TJR Bot</b>  
`,
    {
      reply_markup: mainMenu,
      parse_mode: "HTML", // ✅ enables bold/italic/etc
    }
  );
  await ctx.reply(MESSAGES.welcome_text, {
    reply_markup: inlineMenu,
    parse_mode: "HTML", // ✅ enables bold/italic/etc
  });
}
