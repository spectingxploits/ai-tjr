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
import { MESSAGES } from "../messages";

export async function editTradesConversation(
  conversation: Conversation,
  ctx: Context,
  action: string
) {
  console.log("action", action);
  const connector_gateway_instance = ConnectorGateway.getInstance();
  if (action.includes("close_position")) {
    try {
      let user_address = await connector_gateway_instance.getUserAddress(ctx);
      let msg = await ctx.reply(
        ` ✅ Fetching positions for ${user_address.slice(0, 6)}...`
      );
      let closeable_positions: Record<string, GlobalClosablePosition> =
        await connector_gateway_instance.getCloseablePositions(ctx);
      console.log("closeable_positions", closeable_positions);
      if (Object.keys(closeable_positions).length === 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id.toString(),
          msg.message_id,
          "No position found to close 🤷‍♂️"
        );
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
\n ${SuperJSON.stringify(closeable_positions[key])}
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

          let webAppUrl = await connector_gateway_instance.closePosition(
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

  if (action.includes("cancel_order")) {
    try {
      let user_address = await connector_gateway_instance.getUserAddress(ctx);
      let msg = await ctx.reply(
        ` ✅ Fetching orders for ${user_address.slice(0, 6)}...`
      );
      let cancelable_orders: Record<string, GlobalCancelableOrder> =
        await connector_gateway_instance.getCancelableOrders(ctx);

      console.log("cancelable_orders", cancelable_orders);
      if (Object.keys(cancelable_orders).length === 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id.toString(),
          msg.message_id,
          "No order found to cancel 🤷‍♂️"
        );
        return;
      }
      let inline_keyboard: InlineKeyboardButton[][] = [];
      for (const key of Object.keys(cancelable_orders)) {
        inline_keyboard.push([
          {
            text: `${cancelable_orders[key].connector_name} - ${cancelable_orders[key].pair_name}`,
            callback_data: `cancel_order_req:${key}`,
          },
        ]);
      }

      await ctx.api.editMessageText(
        ctx.chat!.id.toString(),
        msg.message_id,
        `Select a order to close:`,
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
          let render_data: Record<string, any> = {};
          render_data[cancelable_orders[key].connector_name] =
            cancelable_orders[key].order;
          await ctx.api.editMessageText(
            cbCtx.chat!.id.toString(),
            msg_id,
            `
Please select "confirm" to cancel the following Order:
\n${MESSAGES.open_orders(render_data)}
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
          console.log("cancel confirmed ", cancelable_orders[key]);
          let webAppUrl = await connector_gateway_instance.cancelOrder(
            conversation,
            ctx,
            msg_id,
            cancelable_orders[key]
          );
          console.log("webAppUrl", webAppUrl);
          if (!webAppUrl.success) {
            await ctx.api.editMessageText(
              ctx.chat!.id.toString(),
              msg_id,
              `Failed to cancel Order ${cancelable_orders[key].pair_name}`,
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
            `Click "Confirm" to Cancel ${cancelable_orders[key].pair_name} Order on ${cancelable_orders[key].connector_name}`,
            {
              reply_markup: {
                inline_keyboard: keyboard,
              },
              parse_mode: "HTML",
            }
          );

          continue;
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

  if (action.includes("update_tp_sl")) {
    // let get user address
    let user_address = await connector_gateway_instance.getUserAddress(ctx);
    let msg = await ctx.reply(
      ` ✅ Fetching open positions for ${user_address.slice(0, 6)}...`
    );

    let positions: Record<string, GlobalClosablePosition> =
      await connector_gateway_instance.getCloseablePositions(ctx);

    console.log("closable_positions", positions);

    if (Object.keys(positions).length === 0) {
      await ctx.api.editMessageText(
        ctx.chat!.id.toString(),
        msg.message_id,
        "No position found to update TP & SL 🤷‍♂️"
      );
      return;
    }

    let inline_keyboard: InlineKeyboardButton[][] = [];

    for (const key of Object.keys(positions)) {
      inline_keyboard.push([
        {
          text: `${positions[key].connector_name} - ${positions[key].pair_name}`,
          callback_data: `update_position_req:${key}`,
        },
      ]);
    }

    await ctx.api.editMessageText(
      ctx.chat!.id.toString(),
      msg.message_id,
      `Select a position to update TP & SL:`,
      {
        reply_markup: {
          inline_keyboard,
        },
      }
    );

    let back = false;
    let msg_id = msg.message_id;
    let new_tp = 0;
    let new_sl = 0;
    while (!back) {
      let cbCtx = await conversation.waitFor("callback_query");
      await cbCtx.answerCallbackQuery();

      const data = cbCtx.callbackQuery.data;

      if (data?.startsWith("back_to_select_position")) {
        await ctx.api.editMessageText(
          cbCtx.chat!.id.toString(),
          msg_id,
          "Select position to update TP & SL:",
          {
            reply_markup: {
              inline_keyboard,
            },
            parse_mode: "HTML",
          }
        );
        continue;
      }
      if (data?.startsWith("update_position_req:")) {
        const key = data.split(":")[1];
        // getting the new values from the user
        await ctx.api.editMessageText(
          cbCtx.chat!.id.toString(),
          msg_id,
          `Please enter the new TP Value (price in usd):`,
          {
            reply_markup: {
              inline_keyboard: [
                [
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
        let tpCtx = await conversation.waitFor("message:text");
        new_tp = Number(tpCtx.message.text.trim());
        await ctx.api.editMessageText(
          cbCtx.chat!.id.toString(),
          msg_id,
          `Please enter the new SL Value (price in usd):`,
          {
            reply_markup: {
              inline_keyboard: [
                [
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
        let slCtx = await conversation.waitFor("message:text");
        new_sl = Number(slCtx.message.text.trim());

        // sending the new values to the bot
        await ctx.api.editMessageText(
          cbCtx.chat!.id.toString(),
          msg_id,
          `
Please select "confirm" to update the following position TP & SL: \n
\n new take profit trigger price : ${new_tp}
\n new stop loss trigger price : ${new_sl}
`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Confirm",
                    callback_data: `update_position_confirm:${key}`,
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
      if (data?.startsWith("update_position_confirm:")) {
        const key = data.split(":")[1];

        let urlRes = await connector_gateway_instance.updatePostionTPSL(
          conversation,
          ctx,
          msg_id,
          positions[key],
          new_tp,
          new_sl
        );
        if (!urlRes.success) {
          await ctx.api.editMessageText(
            ctx.chat!.id.toString(),
            msg_id,
            `Failed to Update TP & SL for ${positions[key].pair_name}`,
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
        let buttons: InlineKeyboardButton[] =
          urlRes.data.length === 1
            ? [
                {
                  text: "Confirm",
                  web_app: { url: urlRes.data[0] },
                },
              ]
            : [
                {
                  text: "Confirm tp",
                  web_app: { url: urlRes.data[1] },
                },
                {
                  text: "Confirm sl",
                  web_app: { url: urlRes.data[2] },
                },
              ];

        let keyboard: InlineKeyboardButton[][] = [
          [
            ...buttons,
            {
              text: "⬅️ Back",
              callback_data: "back_to_select_position",
            },
          ],
        ];

        // sending the new values to the bot
        await ctx.api.editMessageText(
          cbCtx.chat!.id.toString(),
          msg_id,
          `Click "Confirm" to Update ${positions[key].pair_name} position on ${positions[key].connector_name}`,
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
  }
}
