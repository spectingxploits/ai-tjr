//   // get user address
//   if (!ctx.chat?.id) {
//     return Promise.reject("No chat id found");
//   }
//   let user_address = await connector_gateway.getUserAddress(ctx);
//   console.log("user_address", user_address);

//   const faucetPayload = (
//     (connector_gateway.merkle! as any).merkle_client as MerkleClient
//   ).payloads.testnetFaucetUSDC({
//     amount: BigInt(10_000_000),
//   });
//   let payload: MerkleTestTradePayload = {
//     function: faucetPayload.function,
//     typeArguments: [],
//     functionArguments: faucetPayload.functionArguments,
//   };
//   const wrapper: WRAPPER = {
//     payload,
//     userAddress: user_address,
//     mainnet: connector_gateway.network === Network.MAINNET,
//     connectorName: "merkle_trade_perpetual_connector",
//     signal: {
//       market: true,
//       enter: null,
//       profit: null,
//       loss: null,
//       tp: null,
//       sl: null,
//       lq: 10,
//       leverage: null,
//       long: null,
//       symbol: "USDC",
//       text: null,
//       aiDetectedSuccessRate: null,
//       reasons: [],
//     },
//     telegramChatId: String(ctx.chat!.id), // added field
//   };

//   // encode the wrapper for safe URL transport
//   const encoded = encodeURIComponent(SuperJSON.stringify(wrapper));

//   const webAppUrl = `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/trade/sign?payload=${encoded}`;
//   ctx.reply("Claiming testnet USDC...", {
//     reply_markup: {
//       inline_keyboard: [
//         [
//           {
//             text: "Claim",
//             web_app: { url: webAppUrl },
//           },
//         ],
//       ],
//     },
//   });
