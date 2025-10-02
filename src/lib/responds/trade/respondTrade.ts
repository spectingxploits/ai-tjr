import { InlineKeyboardButton } from "grammy/types";
import { MESSAGES } from "../messages";

export async function respondTrade(ctx: any) {
  let keyboard: InlineKeyboardButton[][] = [
    [
      { text: "get_open_orders", callback_data: "get_open_orders" },
      { text: "get_open_positions", callback_data: "get_open_positions" },
    ],
    [
      { text: "get_trade_history", callback_data: "get_trade_history" },
      { text: "get_price", callback_data: "get_price" },
    ],
    [
      { text: "get_balance", callback_data: "get_balance" },
      { text: "cancel_order", callback_data: "cancel_order" },
    ],
    [
      { text: "close_position", callback_data: "close_position" },
      { text: "update_tp_sl", callback_data: "update_tp_sl" },
    ],
  ];

  await ctx.reply(MESSAGES.trade, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}
