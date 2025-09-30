// src/services/core/botPoll.ts
import { sendOpenAuthPageButton } from "@/lib/responds/wallet/connectButton";
import { ConnectorGateway } from "@/lib/connectors/connector";
import { parseRawPotentialSignal } from "@/lib/helpers/signalParser";
import { Network } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import { Bot, Context } from "grammy";
import { respondStartMessage } from "@/lib/responds/startRespond";
import { setGatewayId } from "../db/gateway";
import { respondChannelUpdates } from "@/lib/responds/automation/gateway_channel";
import { respondAutomation } from "@/lib/responds/automation/main";
import {
  respondAutomate,
  respondDeactivate,
  respondSetupAutomationConversation,
} from "@/lib/responds/automation/setup";
import {
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { MESSAGES } from "@/lib/responds/messages";
import {
  editToEditAndConfirmExt,
  respondEditAndConfirm,
} from "@/lib/responds/trade/EditAndConfirm";
import { editConversation } from "@/lib/responds/trade/editConversation";
import { clearPendingEdit, getPendingEdit } from "@/lib/sessionStore";
import { priceConversation } from "@/lib/responds/trade/priceConversation";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN env var not found.");

// create the bot with the flavored context
const bot = new Bot<ConversationFlavor<Context>>(
  process.env.TELEGRAM_BOT_TOKEN!
);

// register conversations middleware BEFORE other handlers
bot.use(conversations());

// bot.use(createConversation(respondSetupAutomationConversation));

bot.use(createConversation(respondAutomate));

bot.use(createConversation(respondDeactivate));

bot.use(createConversation(editConversation));

bot.use(createConversation(priceConversation));

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
            if (
              signal == null ||
              !signal[0].signalDetected ||
              !signal[0].values
            ) {
              console.log("No signal parsed.");
              return;
            }
            console.log("signal", signal);
            console.log("sending edit and confirm");
            console.log("admin", admin.user.id);
            await respondEditAndConfirm(
              admin.user.id.toString(),
              signal[0].values,
              signal[1]
            );
            console.log("sent edit and confirm");
          } catch (e) {
            console.warn("Failed to DM admin", admin.user.id, e);
          }
        }
      }
    } catch (e) {
      console.error("getChatAdministrators failed:", e);
    }
  });

  bot.on(
    [
      "msg:forward_origin:channel",
      "msg:forward_origin",
      "msg:forward_origin",
      "msg:forward_origin:hidden_user",
      "msg:forward_origin:user",
    ],
    async (ctx) => {
      await respondSetupAutomationConversation({} as any, ctx);
    }
  );

  bot.hears("💼 Wallet", async (ctx) => {
    await sendOpenAuthPageButton(ctx, true, true);
  });

  bot.hears("⚡ Automation", async (ctx) => {
    await respondAutomation(ctx);
  });
  bot.hears("❓ Help", async (ctx) => {
    await ctx.reply(MESSAGES.help);
  });
  bot.hears("📊 Trade", async (ctx) => {
    // await respondTrade(ctx);
    ctx.reply("trade");
  });

  bot.on("message:text", async (ctx) => {
    console.log("Received message:", ctx.message.text);
    console.log("this is the id ", ctx.chat.id.toString());

    if (ctx.message.text.trim().includes("/start")) {
      await respondStartMessage(ctx);
    }

    if (ctx.message.text.trim().includes("/wallet")) {
      await sendOpenAuthPageButton(ctx, true, true);
    }

    if (ctx.message.text.trim().includes("/connect_wallet")) {
      await sendOpenAuthPageButton(ctx, true, false);
    }

    if (ctx.message.text.trim().includes("/disconnect_wallet")) {
      await sendOpenAuthPageButton(ctx, false, false);
    }

    if (ctx.message.text.trim().includes("/automation")) {
      await respondAutomation(ctx);
    }
    if (ctx.message.text.trim().includes("/setup_automation")) {
      ctx.reply(
        "to automate a channel you have to forward a message from the channel or the group you want to automate to me."
      );
    }
    if (ctx.message.text.trim().includes("/deactivate_automated_channel")) {
      ctx.reply(
        "to deactivate a automation a channel you have to forward a message from the channel or the group you want to deactivate automation for."
      );
    }

    if (ctx.message.text.trim().includes("/get_balance")) {
      await connector_gateway.getBalance(ctx);
    }

    if (ctx.message.text.trim().includes("/get_open_positions")) {
      await connector_gateway.getOpenPositions(ctx);
    }
    if (ctx.message.text.trim().includes("/get_open_orders")) {
      await connector_gateway.getOpenOrders(ctx);
    }

    if (ctx.message.text.trim().includes("/get_trade_history")) {
      await connector_gateway.getHistory(ctx);
    }
    if (ctx.message.text.trim().includes("/get_price")) {
      await ctx.conversation.enter(
        "priceConversation",
        connector_gateway.getAllPrices
      );
    }
    if (ctx.message.text.trim().includes("/help")) {
      await ctx.reply(MESSAGES.help);
    }
  });

  bot.callbackQuery("automation", async (ctx) => {
    await ctx.answerCallbackQuery(); // removes "loading" spinner on the button
    await respondAutomation(ctx);
  });

  bot.callbackQuery("setup_automation", async (ctx) => {
    await ctx.answerCallbackQuery(); // removes "loading" spinner on the button
    ctx.reply(
      "to automate a channel you have to forward a message from the channel or the group you want to automate to me."
    );
  });

  bot.callbackQuery("deactivate_automated_channel", async (ctx) => {
    await ctx.answerCallbackQuery(); // removes "loading" spinner on the button
    ctx.reply(
      "to deactivate a automation a channel you have to forward a message from the channel or the group you want to deactivate automation for."
    );
  });

  bot.on("msg:contact", async (ctx) => {
    ctx.reply(`phone number shared`);
  });

  // then in your main setup:
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (!data) return;
    await ctx.answerCallbackQuery();

    if (data.startsWith("💼 Walle")) {
      await sendOpenAuthPageButton(ctx, true, true);
    }
    if (data.startsWith("⚡ Automation")) {
      await respondAutomation(ctx);
    }
    if (data.startsWith("❓ Help")) {
      await ctx.reply(MESSAGES.help);
    }
    if (data.startsWith("📊 Trade")) {
      // await respondTrade(ctx);
      ctx.reply("trade");
    }
    if (data.startsWith("automate_instructions:")) {
      const myData = data.split(":")[1]; // the data you passed in
      await ctx.reply(`✅ Automating channel : ${myData.split("_")[1]}`);
      await ctx.conversation.enter("respondAutomate", myData.split("_")[0]);
    }
    if (data.startsWith("deactivate_instructions:")) {
      const myData = data.split(":")[1];
      await ctx.reply(`❌ Deactivating channel : ${myData.split("_")[1]}`);
      await ctx.conversation.enter("respondDeactivate", myData.split("_")[0]);
    }
    if (data.startsWith("edit_signal:")) {
      const token = data.split(":")[1];
      // retriving the data from the session store
      const pendingEdit = getPendingEdit(token);
      console.log("edit_signal token", String(token), "data", pendingEdit);

      if (!pendingEdit) {
        await ctx.reply("No pending edit found for this token.");
        return;
      }
      const { signal, ai_items, createdAt } = pendingEdit;
      console.log("pendingEdit", pendingEdit);

      // send the edit and confirm message
      let msg =
        ctx.callbackQuery?.message ?? ctx.update.callback_query?.message;
      if (!msg || !msg.message_id) {
        console.log("no message found", msg);
        throw new Error("No message found");
      }
      await ctx.conversation.enter(
        "editConversation",
        signal,
        ai_items,
        msg?.message_id,
        String(token)
      );
    }

    if (data.startsWith("confirm_signal:")) {
      const token = data.split(":")[1];
      // retriving the data from the session store
      const pendingEdit = getPendingEdit(token);
      console.log("confirm_signal token", String(token), "data", pendingEdit);
      if (!pendingEdit) {
        await ctx.reply("No pending edit found for this token.");
        return;
      }

      const { signal } = pendingEdit;

      let msg =
        ctx.callbackQuery?.message ?? ctx.update.callback_query?.message;

      if (!msg || !msg.message_id) {
        console.log("no message found", msg);
        throw new Error("No message found");
      }
      await ctx.api.editMessageText(
        ctx.chat!.id,
        msg.message_id,
        "Generating Transactions ..."
      );
      await connector_gateway.handleIncomingSignal(
        ctx,
        signal,
        ctx.chat!.id,
        msg.message_id,
        String(token)
      );
      console.log("Notified admin user", ctx.chat!.id);
    }
    if (data.startsWith("back_to_edit_and_confirm:")) {
      const token = data.split(":")[1];
      // retriving the data from the session store
      const pendingEdit = getPendingEdit(token);
      console.log(
        "back_to_edit_and_confirm token",
        String(token),
        "data",
        pendingEdit
      );
      if (!pendingEdit) {
        await ctx.reply("No pending edit found for this token.");
        return;
      }

      const { signal, ai_items, createdAt } = pendingEdit;

      let msg =
        ctx.callbackQuery?.message ?? ctx.update.callback_query?.message;

      if (!msg || !msg.message_id) {
        console.log("no message found", msg);
        throw new Error("No message found");
      }

      await editToEditAndConfirmExt(
        ctx,
        signal,
        ai_items,
        ctx.chat!.id.toString(),
        String(msg?.message_id),
        String(token)
      );
    }
  });

  bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.chat;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const oldStatus = ctx.myChatMember.old_chat_member.status;

    console.log(
      `Bot membership changed in chat ${chat.id} (${
        chat.title ?? chat.username
      })`
    );
    console.log("Old status:", oldStatus, "New status:", newStatus);

    if (newStatus === "administrator" || newStatus === "member") {
      const admins = await ctx.api.getChatAdministrators(
        ctx.chat.id.toString()
      );
      for (const admin of admins) {
        // only two admins in the forwards, channel, the one who is not the bot is the user to send back the messages
        if (admin.user && !admin.user.is_bot) {
          await setGatewayId(admin.user.id.toString(), ctx.chat.id.toString());
          console.log("Gateway id set for", admin.user.id.toString());
          await respondChannelUpdates(
            true,
            admin.user.id.toString(),
            ctx.chat.title || ctx.chat.username || ctx.chat.id.toString()
          );
        }
      }
    }

    if (newStatus === "left" || newStatus === "kicked") {
      const admins = await ctx.api.getChatAdministrators(
        ctx.chat.id.toString()
      );
      for (const admin of admins) {
        // only two admins in the forwards, channel, the one who is not the bot is the user to send back the messages
        if (admin.user && !admin.user.is_bot) {
          await setGatewayId(admin.user.id.toString(), "");
          console.log("Gateway id REMOVED for", admin.user.id.toString());
          await respondChannelUpdates(
            false,
            admin.user.id.toString(),
            ctx.chat.title || ctx.chat.username || ctx.chat.id.toString()
          );
        }
      }
    }
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
