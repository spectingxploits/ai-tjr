import {
  calcEntryByPaySize,
  dec,
  MerkleClient,
  MerkleClientConfig,
  Order,
  Position,
} from "@merkletrade/ts-sdk";
import { Aptos, Network } from "@aptos-labs/ts-sdk";
import { PerpConnector, Result } from "../../connector";
import {
  OrderResult,
  PerpOpenParams,
  PerpCloseParams,
  PerpTP_SLParams,
  Balance,
  Tokens,
} from "@/models/interfaces";
import {
  MerkleCancelOrderPayload,
  MerkleTradePayload,
  MerkleUpdatePayload,
} from "@/models/merkleTrade/models";
import { signAndSubmit } from "../../signAndSubmit";
import path from "path";
import fs from "fs";
export class MerkleTradeConnector
  extends signAndSubmit
  implements PerpConnector
{
  readonly name: string = "merkle_trade_perpetual_connector";
  network: Network.MAINNET | Network.TESTNET;
  private aptos_client: Aptos = {} as any;
  private merkle_client: MerkleClient = {} as any;

  /** Initialize Merkle + Aptos clients */
  constructor(network: Network.MAINNET | Network.TESTNET) {
    super("merkle_trade_perpetual_connector");
    this.network = network ? Network.MAINNET : Network.TESTNET;
  }

  async init() {
    const config =
      this.network === Network.MAINNET
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet();
    this.merkle_client = new MerkleClient(config);
    this.aptos_client = new Aptos(config.aptosConfig);
  }
  /** ---------- Spot trading (not implemented) ---------- */
  async buySpot(
    symbol: string,
    qty: number,
    price?: number
  ): Promise<OrderResult> {
    return Promise.reject("buySpot not implemented");
  }

  async sellSpot(
    symbol: string,
    qty: number,
    price?: number
  ): Promise<OrderResult> {
    return Promise.reject("sellSpot not implemented");
  }

  /** ---------- Open Long / Short ---------- */
  async openLong(params: PerpOpenParams): Promise<Result<MerkleTradePayload>> {
    this.checkClients();
    return this.openPerp({ ...params, side: "long" });
  }

  async openShort(params: PerpOpenParams): Promise<Result<MerkleTradePayload>> {
    this.checkClients();
    return this.openPerp({ ...params, side: "short" });
  }

  private async openPerp(
    params: PerpOpenParams
  ): Promise<Result<MerkleTradePayload>> {
    this.checkClients();
    try {
      const pairId = `${params.base}_USD`;

      const [pairInfo, pairState] = await Promise.all([
        this.merkle_client.getPairInfo({ pairId }),
        this.merkle_client.getPairState({ pairId }),
      ]);

      console.log("pairInfo", pairInfo);
      console.log("pairState", pairState);

      // USDC always 6 decimals
      const paySize = dec<6>(BigInt(params.size_in_quote * 10 ** 6));
      const { collateral, size } = calcEntryByPaySize(
        paySize,
        params.leverage || 1,
        params.side === "long",
        pairInfo,
        pairState
      );

      console.log("collateral", collateral);
      console.log("size", size);
      console.log("paySize", paySize);

      let payload: MerkleTradePayload;
      if (params.entryType === "market") {
        payload = this.merkle_client.payloads.placeMarketOrder({
          pair: pairId,
          userAddress: params.userAddress,
          sizeDelta: size,
          collateralDelta: collateral,
          isLong: params.side === "long",
          isIncrease: true,
        });
        console.log("payload market", payload);
      } else if (params.entryType === "limit" && params.entryPrice) {
        payload = this.merkle_client.payloads.placeLimitOrder({
          pair: pairId,
          userAddress: params.userAddress,
          sizeDelta: size,
          collateralDelta: collateral,
          isLong: params.side === "long",
          isIncrease: true,
          price: BigInt(params.entryPrice),
        });
        console.log("payload limit", payload);
      } else {
        return { success: false, error: "entryType must be market or limit" };
      }

      return { success: true, data: payload };
    } catch (err) {
      console.log("err", err);
      return { success: false, error: (err as Error).message };
    }
  }

  /** ---------- Close Long / Short ---------- */
  async closeLong(
    params: PerpCloseParams
  ): Promise<Result<MerkleTradePayload>> {
    this.checkClients();
    return this.closePerp(params);
  }

  async closeShort(
    params: PerpCloseParams
  ): Promise<Result<MerkleTradePayload>> {
    this.checkClients();
    return this.closePerp(params);
  }

  private async closePerp(
    params: PerpCloseParams
  ): Promise<Result<MerkleTradePayload>> {
    this.checkClients();

    try {
      const positions = await this.merkle_client.getPositions({
        address: params.userAddress,
      });

      const position = positions.find((p) =>
        p.pairType.endsWith(params.positionId)
      );
      if (!position) {
        return {
          success: false,
          error: `Position ${params.positionId} not found`,
        };
      }

      const payload = this.merkle_client.payloads.placeMarketOrder({
        pair: params.positionId,
        userAddress: params.userAddress,
        sizeDelta: position.size,
        collateralDelta: position.collateral,
        isLong: position.isLong,
        isIncrease: false,
      });

      return { success: true, data: payload };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** ---------- Update TP/SL ---------- */
  async setTP_SL(
    params: PerpTP_SLParams
  ): Promise<Result<MerkleUpdatePayload>> {
    this.checkClients();
    try {
      const positions = await this.merkle_client.getPositions({
        address: params.userAddress,
      });

      const position = positions.find((p) =>
        p.pairType.endsWith(params.positionId)
      );
      if (!position) {
        return {
          success: false,
          error: `Position ${params.positionId} not found`,
        };
      }

      const payload = this.merkle_client.payloads.updateTPSL({
        pair: params.positionId,
        userAddress: params.userAddress,
        isLong: position.isLong,
        takeProfitTriggerPrice: BigInt(params.tpPriceInQuote * 10 ** 6),
        stopLossTriggerPrice: BigInt(params.slPriceInQuote * 10 ** 6),
      });

      return { success: true, data: payload };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** ---------- Cancel Order ---------- */
  async cancelOrder(
    params: PerpCloseParams
  ): Promise<Result<MerkleCancelOrderPayload>> {
    this.checkClients();

    try {
      const orders = await this.merkle_client.getOrders({
        address: params.userAddress,
      });

      const order = orders.find((o) => o.pairType.endsWith(params.positionId));
      if (!order) {
        return {
          success: false,
          error: `Order ${params.positionId} not found`,
        };
      }

      const payload = this.merkle_client.payloads.cancelOrder({
        pair: params.positionId,
        userAddress: params.userAddress,
        orderId: BigInt(order.orderId),
      });

      return { success: true, data: payload };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** ---------- Fetch Data ---------- */
  async fetchOrder(params: PerpCloseParams): Promise<Result<Order>> {
    this.checkClients();

    try {
      const orders = await this.merkle_client.getOrders({
        address: params.userAddress,
      });

      const order = orders.find((o) => o.pairType.endsWith(params.positionId));
      if (!order) {
        return {
          success: false,
          error: `Order ${params.positionId} not found`,
        };
      }

      return { success: true, data: order };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async fetchPosition(params: PerpCloseParams): Promise<Result<Position>> {
    this.checkClients();

    try {
      const positions = await this.merkle_client.getPositions({
        address: params.userAddress,
      });

      const position = positions.find((p) =>
        p.pairType.endsWith(params.positionId)
      );
      if (!position) {
        return {
          success: false,
          error: `Position ${params.positionId} not found`,
        };
      }

      return { success: true, data: position };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async listOpenPositions(
    params: PerpCloseParams
  ): Promise<Result<Position[]>> {
    this.checkClients();

    try {
      const positions = await this.merkle_client.getPositions({
        address: params.userAddress,
      });

      if (!positions || positions.length === 0) {
        return { success: false, error: "No positions found" };
      }

      return { success: true, data: positions };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getTickerPrice(
    symbol: string,
    mainnet: boolean
  ): Promise<Result<number>> {
    this.checkClients();

    try {
      const summary = await this.merkle_client.api.getSummary();

      const price = summary.prices.find((p) => p.id.endsWith(symbol));
      if (!price)
        return { success: false, error: `Price for ${symbol} not found` };

      return { success: true, data: Number(price.price) };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getBalance(
    mainnet: boolean,
    userAddress: string
  ): Promise<Result<Balance[]>> {
    this.checkClients();

    try {
      const balances: Balance[] = [];

      // Native APT
      try {
        const accountInfo = await this.aptos_client.getAccountAPTAmount({
          accountAddress: userAddress,
        });
        balances.push({ asset: "APT", amount: accountInfo / 10 ** 8 });
      } catch {
        // continue without native balance
      }

      // Tokens
      try {
        const tokens = await this.aptos_client.getAccountOwnedTokens({
          accountAddress: userAddress,
        });
        for (const token of tokens) {
          if (token.amount > 0) {
            const asset = token.current_token_data?.token_name ?? "Unknown";
            const decimals = token.current_token_data?.decimals ?? 0;
            balances.push({ asset, amount: token.amount / 10 ** decimals });
          }
        }
      } catch {
        // continue without token balances
      }

      return { success: true, data: balances };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** ---------- Not implemented yet ---------- */
  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    return Promise.reject("setLeverage not implemented");
  }

  async getFundingRate(symbol: string): Promise<number | null> {
    return Promise.reject("getFundingRate not implemented");
  }

  private checkClients() {
    if (!this.merkle_client || !this.aptos_client) {
      throw new Error("MerkleClient and AptosClient not initialized");
    }
  }
  async getTokens(updateTokenList: boolean = false): Promise<Result<Tokens>> {
    try {
      this.checkClients();

      const summary = await this.merkle_client.api.getSummary();

      let tokens: Tokens = {};

      console.log("this is the summary", summary);
      // The pairs can be extracted from the 'prices' array in the summary
      summary.coins.forEach((coin) => {
        tokens[coin.symbol] = {
          address: coin.assetType || "",
          decimals: coin.decimals || 1,
          symbol: coin.symbol || "UNKNOWN",
          name: coin.name || "UNKNOWN",
        };
      });
      if (updateTokenList) {
        console.log(`writing to the token_${this.network}.ts file`);
        const tokensFilePath = path.join(
          process.cwd(),
          "src",
          "models",
          "merkleTrade",
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
  async isPairSupported(base: string, quote: string): Promise<Result<boolean>> {
    try {
      const pairStates = await this.merkle_client.api.getAllPairStates();
      for (const pairState of pairStates) {
        // checking for each quote
        if (pairState.pairType.includes(base + "_USD")) {
          console.log("found pair in merkle", pairState.pairType);
          return Promise.resolve({ success: true, data: true });
        }
      }
      console.log("no pair found in merkle");
      return Promise.resolve({ success: false, error: "No pair found" });
    } catch (err) {
      console.error("[MerkleConnector] isPairSupported error:", err);
      return Promise.reject(err);
    }
  }

  getCustomQuotes(): { symbol: string; decimals: number }[] {
    return [
      {
        symbol: "USDC",
        decimals: 6,
      },
    ];
  }
}
