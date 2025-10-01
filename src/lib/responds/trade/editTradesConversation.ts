import { ConnectorGateway } from "@/lib/connectors/connector";
import { GlobalClosablePosition, GlobalPositions } from "@/models/interfaces";
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

    let msg = await ctx.reply(`Select position to close:`, {
      reply_markup: {
        inline_keyboard,
      },
    });

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
        await ctx.api.editMessageText(
          cbCtx.chat!.id.toString(),
          msg_id,
          "Closing position...",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Closed",
                    callback_data: `close_position_confirm:${key}`,
                  },
                  {
                    text: "⬅️ Back",
                    callback_data: `back_to_select_position`,
                  },
                ],
              ],
            },
          }
        );
        await connector.closePosition(conversation, ctx, closeable_positions[key]);
        back = true;
        break;
      }
    }
  }
  //   if (action === "/cancel_order") {
  //     await ctx.reply(
  //       "Select order to cancel:",
  //       new InlineKeyboard()
  //         .text("Cancel Order", "cancel_order")
  //         .row()
  //         .text("Close Position", "close_position")
  //     );
  //   }
  //   if (action === "update_tp_sl") {
  //     await ctx.reply(
  //       "Select position to update:",
  //       new InlineKeyboard()
  //         .text("Update TP & SL", "update_tp_sl")
  //         .row()
  //         .text("Cancel", "cancel_order")
  //     );
  //   }
}
