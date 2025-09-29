import { Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, Context as GramContext } from "grammy";
import { formatGLobalSignal } from "@/lib/helpers/formatter";
import { GlobalSignal } from "@/models/interfaces";
import { respondEditAndConfirm } from "./EditAndConfirm";

/**
 * Edit a signal interactively inside a conversation.
 * Returns the updated signal and ai_items array.
 */
export async function editConversation(
  conversation: Conversation,
  ctx: GramContext,
  signal: GlobalSignal,
  ai_items: string[]
) {
  // Map editable callback keys -> human label and signal key
  const editableMap: Record<
    string,
    { label: string; signalKey: keyof GlobalSignal | null }
  > = {
    change_order_type: { label: "Order Type", signalKey: "market" }, // boolean
    change_enter_price: { label: "Enter Price", signalKey: "enter" },
    change_profit_price: { label: "Take Profit Price", signalKey: "profit" },
    change_loss_price: { label: "Stop Loss Price", signalKey: "loss" },
    change_liquidity_amount: { label: "Liquidity Amount", signalKey: "lq" },
    change_leverage: { label: "Leverage", signalKey: "leverage" },
    change_side: { label: "Side", signalKey: "long" }, // boolean
  };

  const buildKeyboard = () =>
    new InlineKeyboard()
      .text(
        `Change ${editableMap["change_order_type"].label}`,
        `change_order_type`
      )
      .row()
      .text(
        `Change ${editableMap["change_enter_price"].label}`,
        `change_enter_price`
      )
      .row()
      .text(
        `Change ${editableMap["change_profit_price"].label}`,
        `change_profit_price`
      )
      .row()
      .text(
        `Change ${editableMap["change_loss_price"].label}`,
        `change_loss_price`
      )
      .row()
      .text(
        `Change ${editableMap["change_liquidity_amount"].label}`,
        `change_liquidity_amount`
      )
      .row()
      .text(`Change ${editableMap["change_leverage"].label}`, `change_leverage`)
      .row()
      .text(`Change ${editableMap["change_side"].label}`, `change_side`)
      .row()
      .text("⬅️ Back", "back");

  // initial formatted text
  let formatted = formatGLobalSignal(signal, ai_items);

  // send the editable message and retrieve the message id so we can edit it later
  const sent = await ctx.reply(formatted, {
    reply_markup: buildKeyboard(),
    parse_mode: "HTML",
  });

  const chatId = String(ctx.chat!.id);
  const messageId = (sent as any).message_id;

  let back = false;

  // helper to update the message text (centralized)
  async function updateMessage() {
    formatted = formatGLobalSignal(signal, ai_items);
    try {
      await ctx.api.editMessageText(chatId, messageId, formatted, {
        parse_mode: "HTML",
        reply_markup: buildKeyboard(),
      });
    } catch (e) {
      // ignore edit errors (e.g. message deleted) but at least log
      console.warn("editMessageText failed:", e);
    }
  }

  while (!back) {
    // wait for a callback query (user clicked a button)
    const cqCtx = await conversation.waitFor("callback_query");
    await cqCtx.answerCallbackQuery().catch(() => {
      /* ignore */
    });
    const cbData =
      cqCtx.update.callback_query?.data ?? cqCtx.callbackQuery?.data;
    if (!cbData) continue;

    // handle "back"
    if (cbData === "back") {
      back = true;
      break;
    }

    // order type (market/limit)
    if (cbData === "change_order_type") {
      // show options
      await cqCtx.reply("Select order type:", {
        reply_markup: new InlineKeyboard()
          .text("Market", "change_order_to_market")
          .row()
          .text("Limit", "change_order_to_limit"),
      });

      const sel = await conversation.waitFor("callback_query");
      await sel.answerCallbackQuery().catch(() => {});
      const selData =
        sel.update.callback_query?.data ?? sel.callbackQuery?.data;
      if (!selData) continue;

      if (selData === "change_order_to_market") signal.market = true;
      if (selData === "change_order_to_limit") signal.market = false;

      // user manually changed -> remove ai badge for 'market' if present
      ai_items = ai_items.filter((k) => k !== "market");
      await updateMessage();
      continue;
    }

    // change side (long/short)
    if (cbData === "change_side") {
      await cqCtx.reply("Select side:", {
        reply_markup: new InlineKeyboard()
          .text("Long ⬆️", "change_side_long")
          .row()
          .text("Short ⬇️", "change_side_short"),
      });

      const sel = await conversation.waitFor("callback_query");
      await sel.answerCallbackQuery().catch(() => {});
      const selData =
        sel.update.callback_query?.data ?? sel.callbackQuery?.data;
      if (!selData) continue;

      if (selData === "change_side_long") signal.long = true;
      if (selData === "change_side_short") signal.long = false;

      ai_items = ai_items.filter((k) => k !== "long");
      await updateMessage();
      continue;
    }

    // For numeric / text fields: prompt user to type a value
    const numericCallbacks = [
      "change_enter_price",
      "change_profit_price",
      "change_loss_price",
      "change_liquidity_amount",
      "change_leverage",
    ];
    if (numericCallbacks.includes(cbData)) {
      const fieldMap: Record<string, keyof GlobalSignal> = {
        change_enter_price: "enter",
        change_profit_price: "profit",
        change_loss_price: "loss",
        change_liquidity_amount: "lq",
        change_leverage: "leverage",
      };

      const targetKey = fieldMap[cbData];

      // ask user for the new value
      await cqCtx.reply(
        `Please send the new value for ${editableMap[cbData].label}:`
      );

      // wait for the user's text message
      const msgCtx = await conversation.waitFor("message:text");
      const rawText = msgCtx.message?.text?.trim();
      if (!rawText) {
        await msgCtx.reply("No text received. Cancelled.");
        continue;
      }

      // basic parsing: keep as number when it looks numeric, else store text
      const num = Number(rawText.replace(/,/g, "").replace(/\s+/g, ""));
      const newVal: any = Number.isFinite(num) ? num : rawText;

      // update the signal
      (signal as any)[targetKey] = newVal;

      // remove ai badge for the field the user edited
      ai_items = ai_items.filter((k) => k !== String(targetKey));

      await updateMessage();
      continue;
    }

    // unknown cbData - ignore
  }

  // final update before returning (in case user pressed back without any changes)
  await updateMessage();

  await respondEditAndConfirm(ctx.chat!.id.toString(), signal, ai_items);
}
