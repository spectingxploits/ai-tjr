// kanaPerpsClient.ts
import axios, { AxiosInstance } from "axios";
import { PerpConnector, Result } from "../../connector";
import {
  Balance,
  GlobalOrders,
  GlobalPositions,
  OrderResult,
  PerpCloseParams,
  PerpOpenParams,
  PerpTP_SLParams,
  Tokens,
} from "@/models/interfaces";

import { Order, Position } from "@merkletrade/ts-sdk";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import path, { parse } from "path";
import fs from "fs";
import {
  KanalabsOrderPayload,
  KanalabsResponse,
  KanaOrdersResponse,
  KanaPositionsResponse,
  ParsedKanaOrder,
  ParsedKanaPosition,
  parseKanaOrder,
  parseKanaPosition,
} from "@/models/kanalabs/types";

import { tokens as tokens_mainnet } from "@/models/kanalabs/tokens_mainnet";
import { tokens as tokens_testnet } from "@/models/kanalabs/tokens_testnet";
export class KanalabsConnector implements PerpConnector {
  name: string = "kanalabs_perpetual_connector";
  network: Network.MAINNET | Network.TESTNET;
  tokens: Tokens = {} as any;
  private kanalabsApi: AxiosInstance = {} as any;
  private baseUrl: string = {} as any;
  aptosClient: Aptos = {} as any;

  constructor(network: Network.MAINNET | Network.TESTNET) {
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
  openLong(params: PerpOpenParams): Promise<Result<KanalabsOrderPayload>> {
    this.checkClients();
    return this.openPerp({ ...params, side: "long" });
  }
  openShort(params: PerpOpenParams): Promise<Result<KanalabsOrderPayload>> {
    this.checkClients();
    return this.openPerp({ ...params, side: "short" });
  }
  private async openPerp(
    params: PerpOpenParams
  ): Promise<Result<KanalabsOrderPayload>> {
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
        return Promise.resolve({ success: true, data: payloadData });
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
        return Promise.resolve({ success: true, data: payloadData });
      } else {
        return Promise.reject("order type is not supported");
      }
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  closeLong(params: PerpCloseParams): Promise<Result<KanalabsOrderPayload>> {
    this.checkClients();
    return this.closePerp(params);
  }
  closeShort(params: PerpCloseParams): Promise<Result<KanalabsOrderPayload>> {
    this.checkClients();
    return this.closePerp(params);
  }

  private async closePerp(
    params: PerpCloseParams
  ): Promise<Result<KanalabsOrderPayload>> {
    this.checkClients();

    try {
      const collapseParams = {
        marketId: params.positionId,
      };
      const collapsePayload = await this.kanalabsApi.get("/collapsePosition", {
        params: collapseParams,
      });

      const payloadData = collapsePayload.data.data;

      return { success: true, data: payloadData };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  setLeverage?(symbol: string, leverage: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setTP_SL?(params: PerpTP_SLParams): Promise<Result<KanalabsOrderPayload>> {
    throw new Error("Method not implemented.");
  }
  async cancelOrder(
    order: ParsedKanaOrder,
    userAddress: `0x${string}`
  ): Promise<Result<KanalabsOrderPayload>> {
    try {
      if (!order.orderId || !order.marketId) {
        return {
          success: false,
          error: "orderId or marketId not found",
        };
      }
      const body = {
        marketId: order.marketId,
        cancelOrderIds: [order.orderId],
        orderSides: Number(order.orderType) % 2 === 0 ? [true] : [false],
      };

      const res = await this.kanalabsApi.post("/cancelMultipleOrders", body, {
        headers: {
          "x-api-key": process.env.API_KEY,
          "Content-Type": "application/json",
        },
      });

      const payloadData = res.data.data;

      return { success: true, data: payloadData };
    } catch (e) {
      console.error("cancelOrder failed:", e);
      return { success: false, error: (e as Error).message };
    }
  }
  async listOpenOrders(
    userAddress: `0x${string}`
  ): Promise<Result<GlobalOrders>> {
    let ordersRes: KanaOrdersResponse = (
      await this.kanalabsApi.get("/getOpenOrders", {
        params: { userAddress: userAddress },
      })
    ).data;
    if (!ordersRes.success) {
      return Promise.reject(ordersRes.message);
    }
    let parsedPositions: ParsedKanaOrder[] = [];
    for (const p of ordersRes.data) {
      parsedPositions.push(parseKanaOrder(p));
    }
    return Promise.resolve({ success: true, data: parsedPositions });
  }

  async listOpenPositions(
    userAddress: `0x${string}`
  ): Promise<Result<GlobalPositions>> {
    let positionsRes: KanaPositionsResponse = (
      await this.kanalabsApi.get("/getPositions", {
        params: { userAddress: userAddress },
      })
    ).data;
    if (!positionsRes.success) {
      return Promise.reject(positionsRes.message);
    }
    let parsedPositions: ParsedKanaPosition[] = [];
    for (const p of positionsRes.data) {
      parsedPositions.push(parseKanaPosition(p));
    }
    return Promise.resolve({ success: true, data: parsedPositions });
  }

  fetchPosition(params: PerpCloseParams): Promise<Result<Position>> {
    throw new Error("Method not implemented. use list all poisons instead");
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
    console.log("priceRes", priceRes.data.data);
    return Promise.resolve({
      success: true,
      data:
        (Number(priceRes.data.data.bestAskPrice) +
          Number(priceRes.data.data.bestBidPrice)) /
        2,
    });
  }
  async getBalance(
    mainnet: boolean,
    userAddress: string
  ): Promise<Result<Balance[]>> {
    try {
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
    } catch (e) {
      console.error("getBalance failed:", e);
      return Promise.resolve({ success: true, data: [] });
    }
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
