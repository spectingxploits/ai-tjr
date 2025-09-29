export const dynamic = "force-dynamic";

export const fetchCache = "force-no-store";

import { sendOpenSignPageButton } from "@/lib/responds/trade/confirmButton";
import { sendOpenAuthPageButton } from "@/lib/responds/wallet/connectButton";

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
  // if (ctx.message.text.trim().includes("/test_confirm_page")) {
  //   await sendOpenSignPageButton(ctx.chat.id.toString(), {
  //     payload: "some_payload",
  //     userAddress: "0x0",
  //     mainnet: false,
  //     connectorName: "hyperion_swap_connector",
  //     signal: {
  //       market: false,
  //       enter: null,
  //       profit: null,
  //       loss: null,
  //       tp: null,
  //       sl: null,
  //       lq: null,
  //       leverage: null,
  //       long: null,
  //       symbol: "",
  //       reasons: [],
  //     },
  //   });
  // }
});

export const POST = webhookCallback(bot, "std/http");
