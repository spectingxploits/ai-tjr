// import {
//   OrderResult,
//   PerpOpenParams,
//   BasePosition,
//   TimeInForce,
// } from "@/models/interfaces";
// import { PerpConnector, SwapConnector } from "./connector";
// import {
//   AptosConfig,
//   Aptos,
//   Network,
//   Account,
//   Ed25519PrivateKey,
//   PrivateKey,
//   PrivateKeyVariants,
// } from "@aptos-labs/ts-sdk";
// import axios from "axios";

// export class KanaLabsConnector implements PerpConnector {
//   name: string = "Kanalabs";
//   buySpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
//     throw new Error("Method not implemented.");
//   }
//   sellSpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
//     throw new Error("Method not implemented.");
//   }
//   openPosition(params: PerpOpenParams): Promise<BasePosition> {
//     throw new Error("Method not implemented.");
//   }
//   openLong(
//     params: Omit<PerpOpenParams, "side"> & { side?: "long" }
//   ): Promise<BasePosition> {

//     const config = new AptosConfig({ network: Network.TESTNET });
//     const aptos = new Aptos(config);

//     const baseURL = "https://perps-tradeapi.kanalabs.io/placeLimitOrder";
//     const limitOrderParams = {
//       marketId: 501,
//       tradeSide: true,
//       direction: false,
//       size: 1.5,
//       price: 5.7,
//       leverage: 2,
//     };
//     const res = await axios.get(baseURL, {
//       params,
//       headers: {
//         "x-api-key": process.env.API_KEY,
//       },
//     });
//     const payloadData = res.data.data;
//     const transactionPayload = await aptos.transaction.build.simple({
//       sender: account.accountAddress,
//       data: payloadData,
//     });
//     const committedTxn = await aptos.transaction.signAndSubmitTransaction({
//       transaction: transactionPayload,
//       signer: account,
//     });
//     console.log(`Submitted transaction: ${committedTxn.hash}`);
//     const response = await aptos.waitForTransaction({
//       transactionHash: committedTxn.hash,
//     });
//     console.log("response", response.success);
//   }
//   openShort(
//     params: Omit<PerpOpenParams, "side"> & { side?: "short" }
//   ): Promise<BasePosition> {
//     throw new Error("Method not implemented.");
//   }
//   closePosition(
//     positionId: string,
//     opts?: { closeSize?: number; tif?: TimeInForce; clientId?: string }
//   ): Promise<OrderResult> {
//     throw new Error("Method not implemented.");
//   }
//   closeLong(
//     positionId: string,
//     opts?: { closeSize?: number }
//   ): Promise<OrderResult> {
//     throw new Error("Method not implemented.");
//   }
//   closeShort(
//     positionId: string,
//     opts?: { closeSize?: number }
//   ): Promise<OrderResult> {
//     throw new Error("Method not implemented.");
//   }
//   setLeverage?(symbol: string, leverage: number): Promise<boolean> {
//     throw new Error("Method not implemented.");
//   }
//   setTP?(positionId: string, tpPrice: number): Promise<OrderResult | null> {
//     throw new Error("Method not implemented.");
//   }
//   setSL?(positionId: string, slPrice: number): Promise<OrderResult | null> {
//     throw new Error("Method not implemented.");
//   }
//   cancelOrder(orderId: string): Promise<boolean> {
//     throw new Error("Method not implemented.");
//   }
//   fetchOrder(orderId: string): Promise<OrderResult> {
//     throw new Error("Method not implemented.");
//   }
//   fetchPosition(positionId: string): Promise<BasePosition | undefined> {
//     throw new Error("Method not implemented.");
//   }
//   listOpenPositions(): Promise<BasePosition[]> {
//     throw new Error("Method not implemented.");
//   }
//   getTickerPrice(
//     symbol: string
//   ): Promise<{ bid?: number; ask?: number; mark?: number; last?: number }> {
//     throw new Error("Method not implemented.");
//   }
//   getBalance(asset: string): Promise<number> {
//     throw new Error("Method not implemented.");
//   }
//   getFundingRate?(symbol: string): Promise<number | null> {
//     throw new Error("Method not implemented.");
//   }
// }
