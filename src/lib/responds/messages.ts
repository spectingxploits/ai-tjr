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
I can help you <b>automate your trading strategy</b> with my powerful AI.  

To start your trading journey, first connect your wallet and then click on automation :  

1️⃣ <b>💼 Wallet</b>  
2️⃣ <b>⚡ Automation</b>
3️⃣ <b>📊 Trade</b>
4️⃣ <b>❓ Help</b>

⚡ Let’s get started and take your trading to the next level!
    `,
};
