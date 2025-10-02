import {
  Balance,
  GlobalHistory,
  GlobalOrders,
  GlobalPositions,
} from "@/models/interfaces";
import { ParsedKanaHistory } from "@/models/kanalabs/types";
import { TradeHistory } from "@merkletrade/ts-sdk";
import stringify from "json-stringify-pretty-compact";

// all message should be sent with parse_mode: "HTML"
export const MESSAGES = {
  help: `
🤖 AI-TJR Bot Help  

🔑 Wallet  
/connect_wallet – Connect Petra wallet  
/disconnect_wallet – Disconnect wallet  

⚡ Automation  
/setup_automation – Setup signal automation (via Telefeed)  
/deactivate_automated_channel – Deactivate an automated channel  

📊 Trading  
/get_open_orders – View open orders  
/get_open_positions – View positions  
/get_order_history – Order history  
/get_position_history – Position history  
/get_price – Get token price  
/get_balance – Get token balance  
/cancel_order – Cancel an order  
/close_position – Close a position  
/update_tp_sl – Update TP & SL  

📌 Shortcuts  
/wallet – Wallet options  
/automation – Automation options  
/trade – Trade options  
/help – Show all commands  
    `,
  no_gateway_found: `⚠️ <b>No gateway forwarding channel found.</b>

👉 <b>Follow these steps to create one:</b>

1️⃣ Create a new <b>Telegram Channel</b> from your account.
2️⃣ Add <b>AI-TJR Bot</b> as an <b>Admin</b> of the channel.

📌 <b>Important notes</b>:
• Do <b>not</b> add any other users to the channel.
• Make sure the bot has <b>admin rights</b> (post & manage messages).

✅ Once that’s done, the bot will automatically detect it and guide you through the next steps.
`,

  automate_instructions: (
    phone_number: string,
    channel_id: string,
    forward_channel_id: string
  ) => `
<b>🚀 Follow the steps below to automate your channel:</b>

<b>1️⃣ Setup your Telefeed account</b>
   • Copy this message: <code>/connect ${phone_number}</code>  
   • start the <a href="https://t.me/tg_feedbot">Telefeed Bot</a> and paste what you copied above.  

<b>2️⃣ Create a new automation group</b>  
   • Copy this message and send it to <a href="https://t.me/tg_feedbot">Telefeed Bot</a>:  
   <code>/redirection add aitjrforw_${String(channel_id)
     .replace("-100", "")
     .slice(5)}_${String(forward_channel_id)
    .replace("-100", "")
    .slice(5)} on ${phone_number}</code>  

<b>3️⃣ Connect your channels</b>  
   • Copy this message and send it to <a href="https://t.me/tg_feedbot">Telefeed Bot</a>:  
   <code>${String(channel_id).replace("-100", "")} - ${String(
    forward_channel_id
  ).replace("-100", "")}</code>  

<b>4️⃣ 🎉 Congrats!</b>  
   Your automation is ready. \n now <b>AI-TJR Bot 🤖</b> will notify you when ever a new trading opportunity is available on this channel.
`,

  deactivate_instructions: (
    channel_id: string,
    forward_channel_id: string,
    phone_number: string
  ) => `
<b>⚡ Follow the steps below to deactivate channel automation:</b>

<b>1️⃣ Remove the automation group</b>  
   • Copy this message and send it to <a href="https://t.me/tg_feedbot">Telefeed Bot</a>:  
   <code>/redirection remove aitjrforw_${String(channel_id)
     .replace("-100", "")
     .slice(5)}_${String(forward_channel_id)
    .replace("-100", "")
    .slice(5)} on ${phone_number}</code>  
<b>2️⃣ Done!</b>  
   Your automations on <b>aitjrforwards</b> have been removed.  
   If you want automation again, you’ll need to set them up from scratch. 🔄
`,

  contact_request: `
✨ <b>AI-TJR Bot Request</b> ✨  

To enable channel automation, we need your phone number.  

📱 <i>Note:</i>  
• Your number is <b>never</b> stored or shared.  
• For privacy, we ask each time.  

👉 Tap the button below to share securely.
`,

  welcome_text: `
🤖 <b>Automate Your Trading Strategy with AI</b>  

The bot helps you trade smarter by automating strategies and executing signals ⚡ in real time.  

<b>📈 Supported DEXes (v1.6.9):</b>  

- 🌐 Hyperion (Aptos)  
- 🔗 Kanalabs (Aptos)  
- 🌀 MerkleTrade (Aptos)  

<b>🛠 Getting Started:</b>  
1️⃣ Install the <b>Petra Wallet</b> on your 📱 iOS or Android device  
2️⃣ <b>Connect your wallet</b> (click on 💼 <i>Wallet</i>)  
3️⃣ <b>Automate your signals</b> (click on 🤖 <i>Automation</i>)  

✅ Once set up, the bot will monitor 🔍 opportunities and notify you 📩 when trading signals are detected.  

🚀 <b>Start now and take your trading to the next level!</b>
`,
  balances: (balances: Record<string, Balance[]>, bal: number) => {
    return `
💰 <b>Balances</b>

🔘 <b>APT</b>: ${bal.toFixed(3)}

${Object.entries(balances)
  .map(([provider, balancesArr]) => {
    const providerName =
      provider.charAt(0).toUpperCase() +
      provider
        .slice(1)
        .replace("_perpetual_connector", "")
        .replace("_swap_connector", "");

    const assets = balancesArr
      .filter((b) => !["apt", "aptos"].includes(b.asset.toLowerCase())) // skip APT
      .map((b) => `${b.asset}: ${b.amount.toFixed(3)}`)
      .join("\n");

    return `💰 <b>${providerName}</b>\n${assets || `🤷‍♂️ no balance available`}`;
  })
  .join("\n\n")}
  `;
  },

  open_orders: (openOrders: Record<string, GlobalOrders>) => {
    return `
💰 <b>Open Orders</b>

${Object.entries(openOrders)
  .map(([provider, orders]) => {
    const providerName =
      provider.charAt(0).toUpperCase() +
      provider
        .slice(1)
        .replace("_perpetual_connector", "")
        .replace("_swap_connector", "");

    // Normalize into array
    const arr = Array.isArray(orders) ? orders : [orders];

    if (arr.length === 0) {
      return `💰 <b>${providerName}</b>\n🤷‍♂️ no open orders`;
    }

    // Pretty print each order safely
    const formatted = arr
      .map((o) => {
        if ("orderId" in o) {
          // ParsedKanaOrder
          if ("price" in o && "totalSize" in o) {
            return stringify(
              {
                orderId: o.orderId,
                price: o.price,
                size: o.totalSize,
                status: (o as any).status,
                timestamp: o.timestamp,
              },
              { maxLength: 80 }
            );
          }

          // Order
          if ("price" in o && "sizeDelta" in o) {
            return stringify(
              {
                orderId: o.orderId,
                price: o.price,
                size: o.sizeDelta,
                timestamp: o.createdTimestamp,
              },
              { maxLength: 80 }
            );
          }
        }
        return stringify(o, { maxLength: 80 });
      })
      .join("\n\n");

    return `💰 <b>${providerName}</b>\n${formatted}`;
  })
  .join("\n\n")}
    `;
  },

  open_positions: (positionsByProvider: Record<string, GlobalPositions>) => {
    return `
📊 <b>Open Positions</b>

${Object.entries(positionsByProvider)
  .map(([provider, positions]) => {
    const providerName =
      provider.charAt(0).toUpperCase() +
      provider
        .slice(1)
        .replace("_perpetual_connector", "")
        .replace("_swap_connector", "");

    const arr = Array.isArray(positions) ? positions : [positions];

    if (arr.length === 0) {
      return `📊 <b>${providerName}</b>\n🤷‍♂️ no positions`;
    }

    const formatted = arr
      .map((p) => {
        // ParsedKanaPosition
        if ("tradeId" in p) {
          return stringify(
            {
              tradeId: p.tradeId,
              marketId: p.marketId,
              side: p.tradeSide ? "LONG" : "SHORT",
              size: p.size,
              value: p.value,
              entry: p.entryPrice,
              liq: p.liqPrice,
              margin: p.margin,
              tp: p.tp,
              sl: p.sl,
              updated: p.lastUpdated,
            },
            { maxLength: 80 }
          );
        }

        // Position (Move type)
        if ("avgPrice" in p) {
          return stringify(
            {
              user: p.user,
              side: p.isLong ? "LONG" : "SHORT",
              size: p.size,
              collateral: p.collateral,
              entry: p.avgPrice,
              stopLoss: p.stopLossTriggerPrice,
              takeProfit: p.takeProfitTriggerPrice,
              lastExec: p.lastExecuteTimestamp,
            },
            { maxLength: 80 }
          );
        }

        return stringify(p, { maxLength: 80 });
      })
      .join("\n\n");

    return `📊 <b>${providerName}</b>\n${formatted}`;
  })
  .join("\n\n")}
    `;
  },

  history: (historyByProvider: Record<string, GlobalHistory>) => {
    return `
📜 <b>Trade / Order History</b>

${Object.entries(historyByProvider)
  .map(([provider, history]) => {
    const providerName =
      provider.charAt(0).toUpperCase() +
      provider
        .slice(1)
        .replace("_perpetual_connector", "")
        .replace("_swap_connector", "")
        .replace("_connector", "");

    const arr = Array.isArray(history) ? history : [history];

    if (arr.length === 0) {
      return `📜 <b>${providerName}</b>\n🤷‍♂️ no history`;
    }

    const formatted = arr
      .map((h) => {
        // ParsedKanaHistory guard: has numeric marketId and string orderId
        if (
          h &&
          typeof h === "object" &&
          "marketId" in h &&
          typeof (h as any).marketId === "number" &&
          "orderId" in h
        ) {
          const ph = h as ParsedKanaHistory;
          return stringify(
            {
              orderId: ph.orderId,
              tradeId: ph.tradeId,
              status: ph.status,
              marketId: ph.marketId,
              leverage: ph.leverage,
              size: ph.size,
              price: ph.price,
              value: ph.orderValue,
              ts: ph.timestamp,
              updated: ph.lastUpdated,
              txVer: ph.transactionVersion,
            },
            { maxLength: 80 }
          );
        }

        // TradeHistory guard: has version and ts (converted Date)
        if (
          h &&
          typeof h === "object" &&
          "version" in h &&
          ("ts" in h || "pairType" in h)
        ) {
          const th = h as TradeHistory;
          // many numeric fields may be strings — print them compactly
          return stringify(
            {
              version: th.version,
              uid: (th as any).uid,
              orderId: (th as any).orderId,
              pairType: (th as any).pairType,
              eventType: (th as any).eventType,
              side: (th as any).isLong ? "LONG" : "SHORT",
              leverage: (th as any).leverage,
              price: (th as any).price,
              sizeDelta: (th as any).sizeDelta,
              originalSize: (th as any).originalSize,
              pnl: (th as any).pnlWithoutFee,
              fees: {
                entryExit: (th as any).entryExitFee,
                funding: (th as any).fundingFee,
                rollover: (th as any).rolloverFee,
              },
              ts: (th as any).ts,
            },
            { maxLength: 80 }
          );
        }

        // fallback: best-effort stringify
        return stringify(h as any, { maxLength: 80 });
      })
      .join("\n\n");

    return `📜 <b>${providerName}</b>\n${formatted}`;
  })
  .join("\n\n")}
    `;
  },

  prices: (pricesByProvider: Record<string, number>, token: string) => {
    return `
💱 <b>Prices</b>

${Object.entries(pricesByProvider)
  .map(([provider, price]) => {
    const providerName =
      provider.charAt(0).toUpperCase() +
      provider
        .slice(1)
        .replace("_perpetual_connector", "")
        .replace("_swap_connector", "")
        .replace("_connector", "");

    // If no prices, show friendly fallback
    if (!price || price == null) {
      return `💱 <b>${providerName}</b>\n🤷‍♂️ no prices`;
    }

    return `💱 <b>${providerName}</b>\n${token}: ${price}`;
  })
  .join("\n\n")}
    `;
  },

  trade: `
📖 <b>Trading Commands Overview</b>  

🔍 <b>Trading Data</b>  
- <code>/get_open_orders</code> → View your open orders on all supported dexes📑  
- <code>/get_open_positions</code> → Check your active position on all supported dexes 📊
- <code>/get_trade_history</code> → See your past trades  📜
- <code>/get_price</code> → Get token price on all supported dexes 💰  
- <code>/get_balance</code> → Check your Apt balance and your balance on all supported dexes 💳  

⚡ <b>Trading Actions</b>  
- <code>/cancel_order</code> → Cancel an order ❌  
- <code>/close_position</code> → Close a position 🔒  
- <code>/update_tp_sl</code> → Update TP & SL of a open position 🎯  

🚀 Use these commands anytime to manage your trades quickly and efficiently.

`,

  wallet: `
📖 <b>Wallet Commands</b>  

🔑 <b>Connect / Disconnect</b>  

Both following commands will open the wallet connect/disconnect page.

- <code>/connect_wallet</code> → Connect your Petra wallet to the bot. Your wallet address and public key will be securely stored. 🔗  
- <code>/disconnect_wallet</code> → Disconnect your wallet from the bot. Stored wallet data will be removed. ❌  

ٔNOTE: To get you balance you must use /get_balance command 💳

⚡ Use these commands to manage your wallet quickly and securely.
`,
};
