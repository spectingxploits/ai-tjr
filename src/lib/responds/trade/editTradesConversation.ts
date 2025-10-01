import { ConnectorGateway } from "@/lib/connectors/connector";
import {
  GlobalCancelableOrder,
  GlobalClosablePosition,
  GlobalPositions,
} from "@/models/interfaces";
import { Conversation } from "@grammyjs/conversations";
import { Context, InlineKeyboard } from "grammy";
import { InlineKeyboardButton } from "grammy/types";
import SuperJSON from "superjson";

export async function editTradesConversation(
  conversation: Conversation,
  ctx: Context,
  action: string,
  connector: ConnectorGateway
) {
  console.log("action", action);
  if (action === "/close_position") {
    try {
      let user_address = await connector.getUserAddress(ctx);
      let msg = await ctx.reply(
        ` ✅ Fetching positions for ${user_address.slice(0, 6)}...`
      );
      let closeable_positions: Record<string, GlobalClosablePosition> =
        await connector.getCloseablePositions(ctx);
      console.log("closeable_positions", closeable_positions);
      if (Object.keys(closeable_positions).length === 0) {
        await ctx.reply("No positions found to close");
        return;
      }
      let inline_keyboard: InlineKeyboardButton[][] = [];
      for (const key of Object.keys(closeable_positions)) {
        inline_keyboard.push([
          {
            text: `${closeable_positions[key].connector_name} - ${closeable_positions[key].pair_name}`,
            callback_data: `close_position_req:${key}`,
          },
        ]);
      }

      await ctx.api.editMessageText(
        ctx.chat!.id.toString(),
        msg.message_id,
        `Select a position to close:`,
        {
          reply_markup: {
            inline_keyboard,
          },
        }
      );

      let back = false;
      let msg_id = msg.message_id;

      while (!back) {
        let cbCtx = await conversation.waitFor("callback_query");
        await cbCtx.answerCallbackQuery();

        const data = cbCtx.callbackQuery.data;

        if (data?.startsWith("back_to_select_position")) {
          await ctx.api.editMessageText(
            cbCtx.chat!.id.toString(),
            msg_id,
            "Select position to close:",
            {
              reply_markup: {
                inline_keyboard,
              },
              parse_mode: "HTML",
            }
          );
          continue;
        }
        if (data?.startsWith("close_position_req:")) {
          const key = data.split(":")[1];
          await ctx.api.editMessageText(
            cbCtx.chat!.id.toString(),
            msg_id,
            `
Please select confirm to close the following position: \n
/n ${SuperJSON.stringify(closeable_positions[key])}
`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Confirm",
                      callback_data: `close_position_confirm:${key}`,
                    },
                    {
                      text: "⬅️ Back",
                      callback_data: `back_to_select_position`,
                    },
                  ],
                ],
              },
              parse_mode: "HTML",
            }
          );
          continue;
        }
        if (data?.startsWith("close_position_confirm:")) {
          const key = data.split(":")[1];

          let webAppUrl = await connector.closePosition(
            conversation,
            ctx,
            msg_id,
            closeable_positions[key]
          );
          if (!webAppUrl.success) {
            await ctx.api.editMessageText(
              ctx.chat!.id.toString(),
              msg_id,
              `Failed to close position ${closeable_positions[key].pair_name}`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "⬅️ Back",
                        callback_data: `back_to_select_position:`,
                      },
                    ],
                  ],
                },
                parse_mode: "HTML",
              }
            );
            continue;
          }
          let keyboard: InlineKeyboardButton[][] = [];

          keyboard.push([
            {
              text: `Confirm`,
              web_app: { url: webAppUrl.data },
            },
          ]);

          keyboard.push([
            {
              text: "⬅️ Back",
              callback_data: `back_to_select_position`,
            },
          ]);

          await ctx.api.editMessageText(
            cbCtx.chat!.id.toString(),
            msg_id,
            `Click Confirm to Close ${closeable_positions[key].pair_name} position on ${closeable_positions[key].connector_name}`,
            {
              reply_markup: {
                inline_keyboard: keyboard,
              },
              parse_mode: "HTML",
            }
          );

          return Promise.resolve({ success: true, data: true });
        }
        back = true;
        break;
      }
    } catch (e) {
      console.log(e);
      await ctx.reply("Error closing position");
      return;
    }
  }

  if (action === "/cancel_order") {
    try {
      let user_address = await connector.getUserAddress(ctx);
      let msg = await ctx.reply(
        ` ✅ Fetching positions for ${user_address.slice(0, 6)}...`
      );
      let cancelable_order: Record<string, GlobalCancelableOrder> =
        await connector.getCancelableOrders(ctx);

      console.log("cancelable_order", cancelable_order);
      if (Object.keys(cancelable_order).length === 0) {
        await ctx.reply("No order found to close");
        return;
      }
      let inline_keyboard: InlineKeyboardButton[][] = [];
      for (const key of Object.keys(cancelable_order)) {
        inline_keyboard.push([
          {
            text: `${cancelable_order[key].connector_name} - ${cancelable_order[key].pair_name}`,
            callback_data: `cancel_order_req:${key}`,
          },
        ]);
      }

      await ctx.api.editMessageText(
        ctx.chat!.id.toString(),
        msg.message_id,
        `Select a position to close:`,
        {
          reply_markup: {
            inline_keyboard,
          },
        }
      );

      let back = false;
      let msg_id = msg.message_id;

      while (!back) {
        let cbCtx = await conversation.waitFor("callback_query");
        await cbCtx.answerCallbackQuery();

        const data = cbCtx.callbackQuery.data;

        if (data?.startsWith("back_to_select_order")) {
          await ctx.api.editMessageText(
            cbCtx.chat!.id.toString(),
            msg_id,
            "Select Order to close:",
            {
              reply_markup: {
                inline_keyboard,
              },
              parse_mode: "HTML",
            }
          );
          continue;
        }
        if (data?.startsWith("cancel_order_req:")) {
          const key = data.split(":")[1];
          await ctx.api.editMessageText(
            cbCtx.chat!.id.toString(),
            msg_id,
            `
Please select "confirm" to cancel the following Order: \n
/n ${SuperJSON.stringify(cancelable_order[key])}
`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Confirm",
                      callback_data: `cancel_order_confirm:${key}`,
                    },
                    {
                      text: "⬅️ Back",
                      callback_data: `back_to_select_order`,
                    },
                  ],
                ],
              },
              parse_mode: "HTML",
            }
          );
          continue;
        }
        if (data?.startsWith("cancel_order_confirm:")) {
          const key = data.split(":")[1];

          let webAppUrl = await connector.cancelOrder(
            conversation,
            ctx,
            msg_id,
            cancelable_order[key]
          );
          if (!webAppUrl.success) {
            await ctx.api.editMessageText(
              ctx.chat!.id.toString(),
              msg_id,
              `Failed to cancel Order ${cancelable_order[key].pair_name}`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "⬅️ Back",
                        callback_data: `back_to_select_order:`,
                      },
                    ],
                  ],
                },
                parse_mode: "HTML",
              }
            );
            continue;
          }
          let keyboard: InlineKeyboardButton[][] = [];

          keyboard.push([
            {
              text: `Confirm`,
              web_app: { url: webAppUrl.data },
            },
          ]);

          keyboard.push([
            {
              text: "⬅️ Back",
              callback_data: `back_to_select_order`,
            },
          ]);

          await ctx.api.editMessageText(
            cbCtx.chat!.id.toString(),
            msg_id,
            `Click "Confirm" to Cancel ${cancelable_order[key].pair_name} Order on ${cancelable_order[key].connector_name}`,
            {
              reply_markup: {
                inline_keyboard: keyboard,
              },
              parse_mode: "HTML",
            }
          );

          return Promise.resolve({ success: true, data: true });
        }
        back = true;
        break;
      }
    } catch (e) {
      console.log(e);
      await ctx.reply("Error cancelling order");
      return;
    }
  }

  //   if (action === "update_tp_sl") {
  //     await ctx.reply(
  //       "Select position to update:",
  //       new InlineKeyboard()
  //         .text("Update TP & SL", "update_tp_sl")
  //         .row()
  //         .text("Cancel", "cancel_order")
  //     );
  //   }
  // }
}
