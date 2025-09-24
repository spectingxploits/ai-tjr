// src/services/core/botPoll.ts
import { ConnectorGateway } from "@/lib/connectors/connector";
import { parseRawPotentialSignal } from "@/lib/helpers/signalParser";
import { Network } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN env var not found.");

const bot = new Bot(token);

async function setupListeners() {
  const connector_gateway = new ConnectorGateway(Network.MAINNET);
  await connector_gateway.initGatewayConnectors();

  bot.on("channel_post", async (ctx) => {
    const post = ctx.update.channel_post;
    console.log(
      "Channel post received:",
      post?.chat?.id,
      post?.chat?.title,
      "msg id:",
      post?.message_id
    );

    const content = (post?.text ?? post?.caption ?? "").trim();
    if (!content) return;

    try {
      const admins = await ctx.api.getChatAdministrators(post.chat.id);
      for (const admin of admins) {
        // only two admins in the forwards, channel, the one who is not the bot is the user to send back the messages
        if (admin.user && !admin.user.is_bot) {
          try {
            const signal = await parseRawPotentialSignal(content);
            if (!signal?.signalDetected || !signal?.values) {
              console.log("No signal parsed.");
              return;
            }

            await connector_gateway.handleIncomingSignal(
              signal.values,
              admin.user.id
            );
            console.log("Notified admin user", admin.user.id);
          } catch (e) {
            console.warn("Failed to DM admin", admin.user.id, e);
          }
        }
      }
    } catch (e) {
      console.error("getChatAdministrators failed:", e);
    }
  });
}

// Start polling
(async () => {
  let connector_gateway = new ConnectorGateway(Network.TESTNET);
  await connector_gateway.initGatewayConnectors();
  console.log("connector_gateway", connector_gateway);
  await connector_gateway.kanalabs?.getTokens(true);
  // await connector_gateway.hyperion?.getTokens(true);
  // await connector_gateway.merkle?.getTokens(true);
  // console.log("Starting bot with long polling...");
  // await bot.init(); // fetch bot info
  // await setupListeners(); // ✅ register listeners before start
  // bot.start({
  //   onStart: (info) =>
  //     console.log("Bot started as", info.username, "id", info.id),
  // });

  // // graceful shutdown
  // const shutdown = async () => {
  //   console.log("Shutting down bot...");
  //   try {
  //     await bot.stop();
  //   } finally {
  //     process.exit(0);
  //   }
  // };
  // process.on("SIGINT", shutdown);
  // process.on("SIGTERM", shutdown);
})();
