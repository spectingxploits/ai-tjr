// src/services/core/botPoll.ts
import { ConnectorGateway } from "@/lib/connectors/connector";
import { formatGLobalSignal } from "@/lib/helpers/formatter";
import { parseRawPotentialSignal } from "@/lib/helpers/signalParser";
import { Network } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import { Bot } from "grammy";
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token)
  throw new Error("TELEGRAM_BOT_TOKEN environment variable not found.");

const bot = new Bot(token);

async function listener() {
  bot.on("channel_post", async (ctx) => {
    const post = ctx.update.channel_post;
    console.log(
      "Channel post received:",
      post?.chat?.id,
      post?.chat?.title,
      "msg id:",
      post?.message_id
    );
    const text = (post?.text ?? post?.caption ?? "").slice(0, 200);
    console.log("Text:", text);
    let content = (post.text ?? post.caption ?? "").trim();
    // Try to DM first admin(s)
    try {
      const admins = await ctx.api.getChatAdministrators(post.chat.id);
      for (const admin of admins) {
        if (admin.user && !admin.user.is_bot) {
          try {
            let signal = await parseRawPotentialSignal(content);
            if (!signal?.signalDetected || !signal?.values) {
              console.log("No signal parsed.");
              return;
            }
            await ctx.api.sendMessage(
              admin.user.id,
              `new Signal from channel \n ${post.chat.title}:\n\n${signal.values.text}`
            );
            console.log("Notified admin user", admin.user.id);
            break; // notify first human admin only (optional)
          } catch (e) {
            console.warn("Failed to DM admin", admin.user.id, e);
          }
        }
      }
    } catch (e) {
      console.error("getChatAdministrators failed (no permission?):", e);
    }
  });
}

// Start polling and keep process alive
(async () => {
  let connector_gateway = new ConnectorGateway(Network.MAINNET);
  await connector_gateway.initGatewayConnectors();
  try {
    // await connector_gateway.hyperion?.getTokens(true);
    // await connector_gateway.merkle?.getTokens(true);
    await connector_gateway.hyperion?.isPairSupported("APT", "USDT");
  } catch (e) {
    console.error("getTokens failed:", e);
  }
  // console.log("Starting bot with long polling...");
  // await bot.init(); // optional but ensures bot info is fetched
  // bot.start({
  //   onStart: (info) =>
  //     console.log("Bot started as", info.username, "id", info.id),
  // });
  // await listener();

  // // graceful shutdown
  // const shutdown = async () => {
  //   console.log("Shutting down bot...");
  //   try {
  //     await bot.stop();
  //   } catch {}
  //   process.exit(0);
  // };
  // process.on("SIGINT", shutdown);
  // process.on("SIGTERM", shutdown);
})();
