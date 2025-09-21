import {
  calcEntryByPaySize,
  dec,
  MerkleClient,
  MerkleClientConfig,
  Order,
  Position,
} from "@merkletrade/ts-sdk";
import { Aptos } from "@aptos-labs/ts-sdk";
import { PerpConnector, Result } from "../connector";
import {
  OrderResult,
  PerpOpenParams,
  PerpCloseParams,
  PerpTP_SLParams,
  Balance,
} from "@/models/interfaces";
import {
  MerkleCancelOrderPayload,
  MerkleTradePayload,
  MerkleUpdatePayload,
} from "@/models/merkleTrade/models";



export class MerkleTradeConnector implements PerpConnector {
  readonly name: string = "merkle_trade_perpetual_connector";

  /** Initialize Merkle + Aptos clients */
  private async initClients(mainnet: boolean): Promise<{
    merkle: MerkleClient;
    aptos: Aptos;
  }> {
    const config = mainnet
      ? await MerkleClientConfig.mainnet()
      : await MerkleClientConfig.testnet();
    const merkle = new MerkleClient(config);
    const aptos = new Aptos(config.aptosConfig);
    return { merkle, aptos };
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
  async openLong(
    params: PerpOpenParams
  ): Promise<Result<MerkleTradePayload>> {
    return this.openPerp({ ...params, side: "long" });
  }

  async openShort(
    params: PerpOpenParams
  ): Promise<Result<MerkleTradePayload>> {
    return this.openPerp({ ...params, side: "short" });
  }

  private async openPerp(
    params: PerpOpenParams
  ): Promise<Result<MerkleTradePayload>> {
    try {
      const { merkle } = await this.initClients(params.mainnet);
      const pairId = `${params.base}_${params.quote}`;

      const [pairInfo, pairState] = await Promise.all([
        merkle.getPairInfo({ pairId }),
        merkle.getPairState({ pairId }),
      ]);

      // USDC always 6 decimals
      const paySize = dec<6>(BigInt(params.size_in_quote * 10 ** 6));
      const { collateral, size } = calcEntryByPaySize(
        paySize,
        params.leverage || 1,
        params.side === "long",
        pairInfo,
        pairState
      );

      let payload: MerkleTradePayload;
      if (params.entryType === "market") {
        payload = merkle.payloads.placeMarketOrder({
          pair: pairId,
          userAddress: params.userAddress,
          sizeDelta: size,
          collateralDelta: collateral,
          isLong: params.side === "long",
          isIncrease: true,
        });
      } else if (params.entryType === "limit" && params.entryPrice) {
        payload = merkle.payloads.placeLimitOrder({
          pair: pairId,
          userAddress: params.userAddress,
          sizeDelta: size,
          collateralDelta: collateral,
          isLong: params.side === "long",
          isIncrease: true,
          price: BigInt(params.entryPrice),
        });
      } else {
        return { success: false, error: "entryType must be market or limit" };
      }

      return { success: true, data: payload };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** ---------- Close Long / Short ---------- */
  async closeLong(
    params: PerpCloseParams
  ): Promise<Result<MerkleTradePayload>> {
    return this.closePerp(params);
  }

  async closeShort(
    params: PerpCloseParams
  ): Promise<Result<MerkleTradePayload>> {
    return this.closePerp(params);
  }

  private async closePerp(
    params: PerpCloseParams
  ): Promise<Result<MerkleTradePayload>> {
    try {
      const { merkle } = await this.initClients(params.mainnet);
      const positions = await merkle.getPositions({ address: params.userAddress });

      const position = positions.find((p) => p.pairType.endsWith(params.positionId));
      if (!position) {
        return { success: false, error: `Position ${params.positionId} not found` };
      }

      const payload = merkle.payloads.placeMarketOrder({
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
    try {
      const { merkle } = await this.initClients(params.mainnet);
      const positions = await merkle.getPositions({ address: params.userAddress });

      const position = positions.find((p) => p.pairType.endsWith(params.positionId));
      if (!position) {
        return { success: false, error: `Position ${params.positionId} not found` };
      }

      const payload = merkle.payloads.updateTPSL({
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
    try {
      const { merkle } = await this.initClients(params.mainnet);
      const orders = await merkle.getOrders({ address: params.userAddress });

      const order = orders.find((o) => o.pairType.endsWith(params.positionId));
      if (!order) {
        return { success: false, error: `Order ${params.positionId} not found` };
      }

      const payload = merkle.payloads.cancelOrder({
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
    try {
      const { merkle } = await this.initClients(params.mainnet);
      const orders = await merkle.getOrders({ address: params.userAddress });

      const order = orders.find((o) => o.pairType.endsWith(params.positionId));
      if (!order) {
        return { success: false, error: `Order ${params.positionId} not found` };
      }

      return { success: true, data: order };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async fetchPosition(params: PerpCloseParams): Promise<Result<Position>> {
    try {
      const { merkle } = await this.initClients(params.mainnet);
      const positions = await merkle.getPositions({ address: params.userAddress });

      const position = positions.find((p) => p.pairType.endsWith(params.positionId));
      if (!position) {
        return { success: false, error: `Position ${params.positionId} not found` };
      }

      return { success: true, data: position };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async listOpenPositions(params: PerpCloseParams): Promise<Result<Position[]>> {
    try {
      const { merkle } = await this.initClients(params.mainnet);
      const positions = await merkle.getPositions({ address: params.userAddress });

      if (!positions || positions.length === 0) {
        return { success: false, error: "No positions found" };
      }

      return { success: true, data: positions };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getTickerPrice(symbol: string, mainnet: boolean): Promise<Result<number>> {
    try {
      const { merkle } = await this.initClients(mainnet);
      const summary = await merkle.api.getSummary();

      const price = summary.prices.find((p) => p.id.endsWith(symbol));
      if (!price) return { success: false, error: `Price for ${symbol} not found` };

      return { success: true, data: Number(price.price) };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async getBalance(mainnet: boolean, userAddress: string): Promise<Result<Balance[]>> {
    try {
      const { aptos } = await this.initClients(mainnet);
      const balances: Balance[] = [];

      // Native APT
      try {
        const accountInfo = await aptos.getAccountAPTAmount({ accountAddress: userAddress });
        balances.push({ asset: "APT", amount: accountInfo / 10 ** 8 });
      } catch {
        // continue without native balance
      }

      // Tokens
      try {
        const tokens = await aptos.getAccountOwnedTokens({ accountAddress: userAddress });
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
}
