export const dynamic = "force-dynamic";

export const fetchCache = "force-no-store";

import { sendOpenAuthPageButton } from "@/app/controllers/auth";
import { Bot, webhookCallback } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token)
  throw new Error("TELEGRAM_BOT_TOKEN environment variable not found.");

const bot = new Bot(token);
bot.on("message:text", async (ctx) => {
  console.log("Received message:", ctx.message.text);
  if (ctx.message.text.trim().includes("/setup_exchange")) {
    console.log("command detected");
    await sendOpenAuthPageButton(ctx.chat.id.toString());
  }
});

export const POST = webhookCallback(bot, "std/http");
