export const dynamic = "force-dynamic";

export const fetchCache = "force-no-store";

import { sendOpenAuthPageButton } from "@/app/controllers/wallet/connectButton";
import { Bot, webhookCallback } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token)
  throw new Error("TELEGRAM_BOT_TOKEN environment variable not found.");

const bot = new Bot(token);
bot.on("message:text", async (ctx) => {
  console.log("Received message:", ctx.message.text);
  console.log("this is the id ", ctx.chat.id.toString());
  if (ctx.message.text.trim().includes("/connect_wallet")) {
    console.log("command detected");
    await sendOpenAuthPageButton(ctx.chat.id.toString());
  }
  if (ctx.message.text.trim().includes("/test_confirm_page")) { 
  
  }
});

export const POST = webhookCallback(bot, "std/http");
