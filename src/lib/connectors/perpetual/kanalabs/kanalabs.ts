// kanaPerpsClient.ts
import axios, { AxiosInstance } from "axios";
import { PerpConnector, Result } from "../../connector";
import {
  Balance,
  OrderResult,
  PerpCloseParams,
  PerpOpenParams,
  PerpTP_SLParams,
  Tokens,
} from "@/models/interfaces";
import { signAndSubmit } from "../../signAndSubmit";
import {
  MerkleTradePayload,
  MerkleUpdatePayload,
  MerkleCancelOrderPayload,
} from "@/models/merkleTrade/models";
import { Order, Position } from "@merkletrade/ts-sdk";
import {
  Aptos,
  AptosConfig,
  Network,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import path from "path";
import fs from "fs";
import {
  KanalabsOrderPayload,
  KanalabsResponse,
} from "@/models/kanalabs/types";

import { tokens as tokens_mainnet } from "@/models/kanalabs/tokens_mainnet";
import { tokens as tokens_testnet } from "@/models/kanalabs/tokens_testnet";
export class KanalabsConnector extends signAndSubmit implements PerpConnector {
  name: string = "kanalabs_perpetual_connector";
  network: Network.MAINNET | Network.TESTNET;
  tokens: Tokens = {} as any;
  private kanalabsApi: AxiosInstance = {} as any;
  private baseUrl: string = {} as any;
  aptosClient: Aptos = {} as any;

  constructor(network: Network.MAINNET | Network.TESTNET) {
    super("kanalabs_perpetual_connector");
    this.network = network;
    let apiKey = process.env.KANALABS_API_KEY;
    if (!apiKey) {
      throw new Error("Missing API key for Kanalabs");
    }
    this.baseUrl =
      this.network === Network.MAINNET
        ? "https://perps-tradeapi.kana.trade"
        : "https://perps-tradeapi.kanalabs.io";
    this.kanalabsApi = axios.create({
      baseURL: this.baseUrl,
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
      timeout: 15_000,
    });
    let aptosSetting = new AptosConfig({ network: this.network });
    this.aptosClient = new Aptos(aptosSetting);
    if (this.network === Network.MAINNET) {
      this.tokens = tokens_mainnet;
    } else {
      this.tokens = tokens_testnet;
    }
  }
  async init(): Promise<any> {
    return;
  }
  buySpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
    throw new Error("Method not implemented.");
  }
  sellSpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
    throw new Error("Method not implemented.");
  }
  openLong(params: PerpOpenParams): Promise<Result<any>> {
    this.checkClients();
    // return this.openPerp({ ...params, side: "long" });
    return Promise.reject("openLong not implemented");
  }
  openShort(params: PerpOpenParams): Promise<Result<any>> {
    this.checkClients();
    // return this.openPerp({ ...params, side: "short" });
    return Promise.reject("openShort not implemented");
  }
  private async openPerp(
    params: PerpOpenParams
  ): Promise<Result<SimpleTransaction>> {
    try {
      if (params.entryType == "market") {
        const marketParams = {
          marketId: this.tokens[params.base].marketId,
          tradeSide: params.side === "long" ? "true" : "false", // true is for long and false is for short
          direction: false, // this opens position and the false closes it
          size: params.size_in_quote, // without decimals adjustment
          leverage: params.leverage,
          takeProfit: params.tpPrice,
          stopLoss: params.slPrice,
        };
        const res = await this.kanalabsApi.get("/placeMarketOrder", {
          params: marketParams,
        });
        const payloadData = res.data.data;
        const transactionPayload =
          await this.aptosClient.transaction.build.simple({
            sender: params.userAddress,
            data: payloadData,
          });
        return Promise.resolve({ success: true, data: transactionPayload });
      } else if (params.entryType == "limit") {
        const limitParams = {
          marketId: this.tokens[params.base].marketId,
          tradeSide: params.side === "long" ? "true" : "false", // true is for long and false is for short
          direction: false, // this opens position and the false closes it
          size: params.size_in_quote, // without decimals adjustment
          price: params.entryPrice,
          leverage: params.leverage,
          takeProfit: params.tpPrice,
          stopLoss: params.slPrice,
        };
        const res = await this.kanalabsApi.get("/placeLimitOrder", {
          params: limitParams,
        });
        const payloadData = res.data.data;
        const transactionPayload =
          await this.aptosClient.transaction.build.simple({
            sender: params.userAddress,
            data: payloadData,
          });
        return Promise.resolve({ success: true, data: transactionPayload });
      } else {
        return Promise.reject("order type is not supported");
      }
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  closeLong(params: PerpCloseParams): Promise<Result<SimpleTransaction>> {
    this.checkClients();
    return this.closePerp(params);
  }
  closeShort(params: PerpCloseParams): Promise<Result<SimpleTransaction>> {
    this.checkClients();
    return this.closePerp(params);
  }

  private async closePerp(
    params: PerpCloseParams
  ): Promise<Result<SimpleTransaction>> {
    this.checkClients();

    try {
      const collapseParams = {
        marketId: params.positionId,
      };
      const collapsePayload = await this.kanalabsApi.get("/collapsePosition", {
        params: collapseParams,
      });

      const payloadData = collapsePayload.data.data;
      const transactionPayload =
        await this.aptosClient.transaction.build.simple({
          sender: params.userAddress,
          data: payloadData,
        });

      return { success: true, data: transactionPayload };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  setLeverage?(symbol: string, leverage: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setTP_SL?(params: PerpTP_SLParams): Promise<Result<SimpleTransaction>> {
    throw new Error("Method not implemented.");
  }
  cancelOrder(params: PerpCloseParams): Promise<Result<SimpleTransaction>> {
    throw new Error("Method not implemented.");
  }
  fetchOrder(params: PerpCloseParams): Promise<Result<Order>> {
    throw new Error("Method not implemented.");
  }
  fetchPosition(params: PerpCloseParams): Promise<Result<Position>> {
    throw new Error("Method not implemented.");
  }
  listOpenPositions(params: PerpCloseParams): Promise<Result<Position[]>> {
    throw new Error("Method not implemented.");
  }
  async getTickerPrice(symbol: string): Promise<Result<number>> {
    let priceRes = await this.kanalabsApi.get("/getMarketPrice", {
      params: { marketId: this.tokens[symbol].marketId },
    });

    if (
      priceRes.data.data.bestAskPrice == null ||
      priceRes.data.data.bestBidPrice == null
    ) {
      return Promise.resolve({ success: false, error: "No price found" });
    }
    return Promise.resolve({
      success: true,
      data:
        Number(priceRes.data.data.bestAskPrice) +
        Number(priceRes.data.data.bestBidPrice) / 2,
    });
  }
  async getBalance(
    mainnet: boolean,
    userAddress: string
  ): Promise<Result<Balance[]>> {
    let balances: Balance[] = [];

    let aptBal = await this.kanalabsApi.get("/getAccountAptBalance", {
      params: { userAddress },
    });
    balances.push({ asset: "APT", amount: aptBal.data.data });
    let usdtBal = await this.kanalabsApi.get("/getProfileBalanceSnapshot", {
      params: { userAddress },
    });
    balances.push({ asset: "USDT", amount: usdtBal.data.data });
    return Promise.resolve({ success: true, data: balances });
  }
  getFundingRate?(symbol: string): Promise<number | null> {
    throw new Error("Method not implemented.");
  }
  async getTokens(updateTokenList: boolean = false): Promise<Result<Tokens>> {
    try {
      this.checkClients();
      let token_response: KanalabsResponse = (
        await this.kanalabsApi.get("/getPerpetualAssetsInfo/allMarkets")
      ).data;
      //   console.log("token_response", token_response.data);
      if (!token_response) {
        return Promise.reject("No tokens found");
      }
      //   console.log(token_response)
      let tokens: Tokens = {};
      for (const token of token_response.data) {
        tokens[
          token.base_name.split(token.base_name.includes("-") ? "-" : "/")[0]
        ] = {
          address:
            "0x000000000000000000000000000000000000000000000000000000000000000d", // since its a deposit like dex the addresses don't exist, the market contract will handle the exchange and we don't save the market contract address.
          decimals: token.base_decimals,
          symbol: token.base_name.split("_")[0],
          name: token.base_name.split("_")[0],
          marketId: token.market_id,
        };
      }
      if (updateTokenList) {
        console.log(`writing to the token_${this.network}.ts file`);
        const tokensFilePath = path.join(
          process.cwd(),
          "src",
          "models",
          "kanalabs",
          `tokens_${this.network}.ts`
        );
        fs.writeFileSync(
          tokensFilePath,
          `export const tokens = ` + JSON.stringify(tokens, null, 2)
        );
      } else {
        console.log("not writing to the tokens.ts file");
      }
      return Promise.resolve({ success: true, data: tokens });
    } catch (e) {
      console.error("getTokens failed:", e);
      return Promise.reject(e);
    }
  }
  isPairSupported(base: string, quote: string): Promise<Result<boolean>> {
    return Promise.resolve({
      success: true,
      data: this.tokens[base].marketId != undefined,
    });
  }
  getCustomQuotes(): { symbol: string; decimals: number }[] {
    return [
      {
        symbol: "USDT",
        decimals: 6,
      },
    ];
  }
  private checkClients() {
    if (!this.kanalabsApi || !this.aptosClient) {
      throw new Error("KanaLabsClient and AptosClient not initialized");
    }
  }
}

// // kanaPerpsClient.ts
// import axios, { AxiosInstance } from "axios";

// /* --- Minimal types used by your code (expand as needed) --- */
// export type Result<T> = { success: true; data: T } | { success: false; message: string };
// export type OrderResult = Result<any>;
// export type Balance = { symbol: string; amount: number };
// export type Tokens = { markets: any[] }; // raw market objects from API
// export type Position = any;
// export type Order = any;

// /* The Merkle payload shapes you referenced (keep these if you use them downstream) */
// export type MerkleTradePayload = {
//   function: `0x${string}::${string}`;
//   typeArguments: string[];
//   functionArguments: any[];
//   abi?: any;
// };
// export type MerkleUpdatePayload = MerkleTradePayload;
// export type MerkleCancelOrderPayload = MerkleTradePayload;

// /* Convenient Perp param shapes (adjust to your project types) */
// export type PerpOpenParams = {
//   symbol: string;      // e.g. "APT" (base)
//   size: number;        // size in base units (not scaled)
//   leverage: number;
//   takeProfit?: number;
//   stopLoss?: number;
//   userAddress?: string;
// };

// export type PerpCloseParams = {
//   symbol: string;
//   size: number;
//   leverage: number;
//   userAddress?: string;
//   orderId?: string;
// };

// export type PerpTP_SLParams = {
//   symbol: string;
//   tradeSideIsLong: boolean;
//   newPrice: number;
// };

// /* --- SDK class --- */
// export class KanaPerpsClient {
//   private api: AxiosInstance;
//   private baseUrl: string;
//   private marketsCache: any[] | null = null;
//   private apiKey?: string;

//   constructor(opts: { apiKey?: string; network?: "testnet" | "mainnet" } = {}) {
//     const network = opts.network ?? "testnet";
//     this.apiKey = opts.apiKey;
//     this.baseUrl =
//       network === "mainnet"
//         ? "https://perps-tradeapi.kana.trade"
//         : "https://perps-tradeapi.kanalabs.io";
//     this.api = axios.create({
//       baseURL: this.baseUrl,
//       headers: opts.apiKey ? { "x-api-key": opts.apiKey } : undefined,
//       timeout: 15_000,
//     });
//   }

//   /* ---------- Helpers ---------- */

//   private makeResult<T>(resp: any): Result<T> {
//     if (!resp) return { success: false, message: "No response" };
//     if (resp.success === true || resp.data) {
//       return { success: true, data: resp.data ?? resp };
//     }
//     return { success: false, message: resp.message ?? "api error" };
//   }

//   private async fetchMarkets(): Promise<Result<any[]>> {
//     // cached
//     if (this.marketsCache) return { success: true, data: this.marketsCache };

//     try {
//       const res = await this.api.get("/getPerpetualAssetsInfo/allMarkets");
//       const parsed = this.makeResult<any[]>(res.data);
//       if (parsed.success) {
//         this.marketsCache = parsed.data!;
//         return parsed;
//       }
//       return parsed;
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   /** Find marketId by symbol (base symbol like "APT" or "ETH") */
//   private async findMarketBySymbol(symbol: string): Promise<number | null> {
//     const r = await this.fetchMarkets();
//     if (!r.success) return null;
//     const markets = r.data!;
//     // docs show `base_name` like "APT/USDC" — prefer startsWith
//     const found = markets.find((m: any) =>
//       String(m.base_name || "").toUpperCase().startsWith(symbol.toUpperCase())
//     );
//     if (!found) return null;
//     return Number(found.market_id ?? found.market_id);
//   }

//   /* ---------- Market data & account ---------- */

//   async getTokens(updateTokenList = false): Promise<Result<Tokens>> {
//     if (updateTokenList) this.marketsCache = null;
//     const r = await this.fetchMarkets();
//     if (!r.success) return { success: false, message: r.message };
//     return { success: true, data: { markets: r.data! } };
//   }

//   async isPairSupported(base: string, quote: string): Promise<Result<boolean>> {
//     // simple heuristic: check if any market has base starting with base and counter includes quote
//     const r = await this.fetchMarkets();
//     if (!r.success) return { success: false, message: r.message };
//     const found = r.data!.some((m: any) =>
//       (m.base_name || "").toUpperCase() === `${base.toUpperCase()}/${quote.toUpperCase()}`
//     );
//     return { success: true, data: !!found };
//   }

//   getCustomQuotes(): { symbol: string; decimals: number }[] {
//     // default per your spec
//     return [{ symbol: "USDT", decimals: 6 }];
//   }

//   async getTickerPrice(symbol: string, mainnet: boolean): Promise<Result<number>> {
//     // find marketId and call getMarketPrice
//     const marketId = await this.findMarketBySymbol(symbol);
//     if (!marketId) return { success: false, message: `Market for ${symbol} not found` };

//     try {
//       const res = await this.api.get("/getMarketPrice", { params: { marketId } });
//       const parsed = this.makeResult<{ bestAskPrice: number; bestBidPrice: number }>(res.data);
//       if (!parsed.success) return parsed as any;
//       const { bestAskPrice, bestBidPrice } = parsed.data!;
//       // return mid price if available
//       const mid = (Number(bestAskPrice) + Number(bestBidPrice)) / 2;
//       return { success: true, data: mid };
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async getBalance(mainnet: boolean, userAddress: string): Promise<Result<Balance[]>> {
//     try {
//       const res = await this.api.get("/getWalletAccountBalance", { params: { userAddress } });
//       const parsed = this.makeResult<number>(res.data);
//       if (!parsed.success) return parsed as any;
//       // API returns a single number in examples — present as array under USDC/USDT (best-effort)
//       return { success: true, data: [{ symbol: "USDC", amount: Number(parsed.data) }] };
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   /* ---------- Orders / positions / trades ---------- */

//   private async placeMarketOrderInternal(params: {
//     marketId: number;
//     tradeSide: boolean; // true = long, false = short
//     direction: boolean; // false = open, true = close
//     size: number;
//     leverage: number;
//     takeProfit?: number;
//     stopLoss?: number;
//   }): Promise<Result<MerkleTradePayload>> {
//     try {
//       const res = await this.api.get("/placeMarketOrder", {
//         params: {
//           marketId: params.marketId,
//           tradeSide: params.tradeSide,
//           direction: params.direction,
//           size: params.size,
//           leverage: params.leverage,
//           ...(params.takeProfit !== undefined ? { takeProfit: params.takeProfit } : {}),
//           ...(params.stopLoss !== undefined ? { stopLoss: params.stopLoss } : {}),
//         },
//       });
//       return this.makeResult<MerkleTradePayload>(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async openLong(params: PerpOpenParams): Promise<Result<MerkleTradePayload>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     // tradeSide = true (long), direction = false (open)
//     return this.placeMarketOrderInternal({
//       marketId,
//       tradeSide: true,
//       direction: false,
//       size: params.size ?? params.size,
//       leverage: params.leverage,
//       takeProfit: params.takeProfit,
//       stopLoss: params.stopLoss,
//     });
//   }

//   async openShort(params: PerpOpenParams): Promise<Result<MerkleTradePayload>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     // tradeSide = false (short), direction = false (open)
//     return this.placeMarketOrderInternal({
//       marketId,
//       tradeSide: false,
//       direction: false,
//       size: params.size ?? params.size,
//       leverage: params.leverage,
//       takeProfit: params.takeProfit,
//       stopLoss: params.stopLoss,
//     });
//   }

//   async closeLong(params: PerpCloseParams): Promise<Result<MerkleTradePayload>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     // tradeSide true (long), direction true (close)
//     return this.placeMarketOrderInternal({
//       marketId,
//       tradeSide: true,
//       direction: true,
//       size: params.size,
//       leverage: params.leverage,
//     });
//   }

//   async closeShort(params: PerpCloseParams): Promise<Result<MerkleTradePayload>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     // tradeSide false (short), direction true (close)
//     return this.placeMarketOrderInternal({
//       marketId,
//       tradeSide: false,
//       direction: true,
//       size: params.size,
//       leverage: params.leverage,
//     });
//   }

//   async setTP_SL?(params: PerpTP_SLParams): Promise<Result<MerkleUpdatePayload>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     try {
//       // route to updateTakeProfit; if user wants SL use updateStopLoss endpoint
//       const res = await this.api.get("/updateTakeProfit", {
//         params: { marketId, tradeSide: params.tradeSideIsLong, newTakeProfitPrice: params.newPrice },
//       });
//       return this.makeResult<MerkleUpdatePayload>(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async cancelOrder(params: PerpCloseParams): Promise<Result<MerkleCancelOrderPayload>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     try {
//       // Cancel single order by id via cancelMultipleOrders (wrap single)
//       if (!params.orderId) return { success: false, message: "orderId required" };
//       const body = {
//         marketId,
//         cancelOrderIds: [params.orderId],
//         orderSides: [true], // caller should pass correct side if needed; assume true for now
//       };
//       const res = await this.api.post("/cancelMultipleOrders", body, {
//         headers: { "Content-Type": "application/json" },
//       });
//       return this.makeResult<MerkleCancelOrderPayload>(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async fetchOrder(params: PerpCloseParams): Promise<Result<Order>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     if (!params.orderId) return { success: false, message: "orderId required" };
//     try {
//       const res = await this.api.get("/getOrderStatusByOrderId", {
//         params: { marketId, orderId: params.orderId },
//       });
//       return this.makeResult<Order>(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async fetchPosition(params: PerpCloseParams): Promise<Result<Position>> {
//     const marketId = await this.findMarketBySymbol(params.symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     try {
//       const res = await this.api.get("/getPositions", { params: { userAddress: params.userAddress, marketId } });
//       return this.makeResult<Position>(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async listOpenPositions(params: PerpCloseParams): Promise<Result<Position[]>> {
//     try {
//       const res = await this.api.get("/getPositions", { params: { userAddress: params.userAddress } });
//       return this.makeResult<Position[]>(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   /* optional convenience spot buy/sell mapping to market order */
//   async buySpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
//     // Map to placeMarketOrder; but note: Kana perps endpoints are for perps — adapt as needed
//     const marketId = await this.findMarketBySymbol(symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     try {
//       const res = await this.api.get("/placeMarketOrder", {
//         params: { marketId, tradeSide: true, direction: false, size: qty, leverage: 1 },
//       });
//       return this.makeResult(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async sellSpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
//     const marketId = await this.findMarketBySymbol(symbol);
//     if (!marketId) return { success: false, message: "market not found" };
//     try {
//       const res = await this.api.get("/placeMarketOrder", {
//         params: { marketId, tradeSide: false, direction: false, size: qty, leverage: 1 },
//       });
//       return this.makeResult(res.data);
//     } catch (err: any) {
//       return { success: false, message: err.message ?? String(err) };
//     }
//   }

//   async getFundingRate?(symbol: string): Promise<number | null> {
//     // Not in minimal set; if needed, can be implemented using `getPerpetualAssetsInfo` data
//     return null;
//   }

//   async setLeverage?(symbol: string, leverage: number): Promise<boolean> {
//     // Not directly provided in the minimal endpoints — leverage is passed during placeMarketOrder
//     // We expose this as a no-op convenience (or return false)
//     return false;
//   }
// }
