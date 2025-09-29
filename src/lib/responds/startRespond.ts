import { InlineKeyboard, Keyboard } from "grammy";

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
  await ctx.reply(
    `
I can help you <b>automate your trading strategy</b> with my powerful AI.  

To start your trading journey, first connect your wallet and then click on automation :  

1️⃣ <b>💼 Wallet</b>  
2️⃣ <b>⚡ Automation</b>
3️⃣ <b>📊 Trade</b>
4️⃣ <b>❓ Help</b>

⚡ Let’s get started and take your trading to the next level!
    `,
    {
      reply_markup: inlineMenu,
      parse_mode: "HTML", // ✅ enables bold/italic/etc
    }
  );
}

export const mainMenu = new Keyboard()
  .text("💼 Wallet") // → /wallet
  .text("⚡ Automation") // → /automation
  .row()
  .text("📊 Trade") // → /trade
  .text("❓ Help") // → /help
  .resized()
  .persistent();
