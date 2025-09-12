// src/services/core/botPoll.ts
import "dotenv/config";
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token)
  throw new Error("TELEGRAM_BOT_TOKEN environment variable not found.");

const bot = new Bot(token);

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

  // Try to DM first admin(s)
  try {
    const admins = await ctx.api.getChatAdministrators(post.chat.id);
    for (const admin of admins) {
      if (admin.user && !admin.user.is_bot) {
        try {
          await ctx.api.sendMessage(
            admin.user.id,
            `Your channel message (id: ${post.message_id}, message:${(post.text ?? post.caption ?? '').trim()}) was received by the bot.`
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

// Start polling and keep process alive
(async () => {
  console.log("Starting bot with long polling...");
  await bot.init(); // optional but ensures bot info is fetched
  bot.start({
    onStart: (info) =>
      console.log("Bot started as", info.username, "id", info.id),
  });

  // graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down bot...");
    try {
      await bot.stop();
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
