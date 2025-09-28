import { InlineKeyboard } from "grammy";

export async function respondStartMessage(ctx: any) {
  const keyboard = new InlineKeyboard()
    .webApp(
      "Connect Wallet",
      `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/auth?ref=telegram&userId=${ctx.chat.id}`
    )
    .text("Setup Automation", "automation");

  await ctx.reply(
    `
🤖 <b>Hello! I am AI_TJR Bot</b>  

I can help you <b>automate your trading strategy</b> with my powerful AI.  

To start your trading journey, just follow <b>two simple steps</b>:  

1️⃣ <b>Connect your wallet</b>  
2️⃣ <b>Setup your channel automation</b>  

⚡ Let’s get started and take your trading to the next level!
    `,
    {
      reply_markup: keyboard,
      parse_mode: "HTML", // ✅ enables bold/italic/etc
    }
  );
}
