// src/services/core/botPoll.ts
import { sendOpenAuthPageButton } from "@/app/controllers/wallet/connectButton";
import { ConnectorGateway } from "@/lib/connectors/connector";
import { parseRawPotentialSignal } from "@/lib/helpers/signalParser";
import { Network } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import { Bot } from "grammy";
import nacl from "tweetnacl";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN env var not found.");

const bot = new Bot(token);

async function setupListeners() {
  const connector_gateway = new ConnectorGateway(Network.TESTNET);
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

  bot.catch((err) => {
    console.error("Bot error:", err);
  });
}

// Start polling
(async () => {
  // let connector_gateway = new ConnectorGateway(Network.MAINNET);
  // await connector_gateway.initGatewayConnectors();
  // console.log("connector_gateway", connector_gateway);
  // let balances = await connector_gateway.kanalabs?.getTickerPrice("ETH");
  // console.log("balances", balances);
  // await connector_gateway.hyperion?.getTokens(true);
  // await connector_gateway.merkle?.getTokens(true);
  console.log("Starting bot with long polling...");
  await bot.init(); // fetch bot info
  await setupListeners(); // ✅ register listeners before start
  bot.start({
    onStart: (info) =>
      console.log("Bot started as", info.username, "id", info.id),
  });
  // let keyPair = nacl.box.keyPair();
  // console.log("public key ", Buffer.from(keyPair.publicKey).toString("hex"));
  // console.log("priv key ", Buffer.from(keyPair.secretKey).toString("hex"));
  // graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down bot...");
    try {
      await bot.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
