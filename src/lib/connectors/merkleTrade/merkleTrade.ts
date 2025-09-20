import {
  calcEntryByPaySize,
  dec,
  MerkleClient,
  MerkleClientConfig,
  Order,
  Position,
} from "@merkletrade/ts-sdk";
import { Aptos } from "@aptos-labs/ts-sdk";
import { PerpConnector } from "../connector";
import {
  OrderResult,
  PerpOpenParams,
  BasePosition,
  TimeInForce,
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
  name: string = "merkle_trade_perpetual_connector";
  buySpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
    throw new Error("Method not implemented.");
  }
  sellSpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
    throw new Error("Method not implemented.");
  }

  async openLong(
    params: Omit<PerpOpenParams, "side"> & { side?: "long" }
  ): Promise<MerkleTradePayload> {
    // initialize clients

    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const pairInfo = await merkle.getPairInfo({
      pairId: params.base + "_" + params.quote,
    });

    const pairState = await merkle.getPairState({
      pairId: params.base + "_" + params.quote,
    });

    // in this case since the merkle trade is only using the usdc as the quote currency we always use the 6 as decimals
    const paySize = dec<6>(BigInt(params.size_in_quote * 10 ** 6));
    const { collateral, size } = calcEntryByPaySize(
      paySize,
      params.leverage || 1,
      params.side === "long",
      pairInfo,
      pairState
    );

    let openPayload: MerkleTradePayload;

    if (params.entryType === "market") {
      openPayload = merkle.payloads.placeMarketOrder({
        pair: params.base + "_" + params.quote,
        userAddress: params.userAddress,
        sizeDelta: size,
        collateralDelta: collateral,
        isLong: params.side === "long",
        isIncrease: true,
      });
    } else if (params.entryType === "limit" && params.entryPrice) {
      openPayload = merkle.payloads.placeLimitOrder({
        pair: params.base + "_" + params.quote,
        userAddress: params.userAddress,
        sizeDelta: size,
        collateralDelta: collateral,
        isLong: params.side === "long",
        isIncrease: true,
        price: BigInt(params.entryPrice),
      });
    } else {
      throw new Error("entryType must be market or limit");
    }

    return openPayload;
  }
  async openShort(
    params: Omit<PerpOpenParams, "side"> & { side?: "short" }
  ): Promise<MerkleTradePayload> {
    // initialize clients

    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const pairInfo = await merkle.getPairInfo({
      pairId: params.base + "_" + params.quote,
    });

    const pairState = await merkle.getPairState({
      pairId: params.base + "_" + params.quote,
    });

    // in this case since the merkle trade is only using the usdc as the quote currency we always use the 6 as decimals
    const paySize = dec<6>(BigInt(params.size_in_quote * 10 ** 6));
    const { collateral, size } = calcEntryByPaySize(
      paySize,
      params.leverage || 1,
      params.side !== "short",
      pairInfo,
      pairState
    );

    let openPayload: MerkleTradePayload;
    if (params.entryType === "market") {
      openPayload = merkle.payloads.placeMarketOrder({
        pair: params.base + "_" + params.quote,
        userAddress: params.userAddress,
        sizeDelta: size,
        collateralDelta: collateral,
        isLong: params.side !== "short",
        isIncrease: true,
      });
    } else if (params.entryType === "limit" && params.entryPrice) {
      openPayload = merkle.payloads.placeLimitOrder({
        pair: params.base + "_" + params.quote,
        userAddress: params.userAddress,
        sizeDelta: size,
        collateralDelta: collateral,
        isLong: params.side !== "short",
        isIncrease: true,
        price: BigInt(params.entryPrice),
      });
    } else {
      throw new Error("entryType must be market or limit");
    }

    return openPayload;
  }

  async closeLong(params: PerpCloseParams): Promise<MerkleTradePayload> {
    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const positions = await merkle.getPositions({
      address: params.userAddress,
    });

    console.log("Open positions", positions);

    const position = positions.find((position) =>
      position.pairType.endsWith(params.positionId)
    );

    if (!position) {
      throw new Error(` ${params.positionId} position not found`);
    }

    // close position

    const closePayload = merkle.payloads.placeMarketOrder({
      pair: params.positionId,
      userAddress: params.userAddress,
      sizeDelta: position.size,
      collateralDelta: position.collateral,
      isLong: position.isLong,
      isIncrease: false,
    });
    return closePayload;
  }
  async closeShort(params: PerpCloseParams): Promise<MerkleTradePayload> {
    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const positions = await merkle.getPositions({
      address: params.userAddress,
    });

    console.log("Open positions", positions);

    const position = positions.find((position) =>
      position.pairType.endsWith(params.positionId)
    );

    if (!position) {
      throw new Error(` ${params.positionId} position not found`);
    }

    // close position

    const closePayload = merkle.payloads.placeMarketOrder({
      pair: params.positionId,
      userAddress: params.userAddress,
      sizeDelta: position.size,
      collateralDelta: position.collateral,
      isLong: position.isLong,
      isIncrease: false,
    });
    return closePayload;
  }
  setLeverage?(symbol: string, leverage: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  async setTP_SL?(params: PerpTP_SLParams): Promise<MerkleUpdatePayload> {
    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const positions = await merkle.getPositions({
      address: params.userAddress,
    });

    console.log("Open positions", positions);

    const position = positions.find((position) =>
      position.pairType.endsWith(params.positionId)
    );

    if (!position) {
      throw new Error(` ${params.positionId} position not found`);
    }

    // update position tp sl  position

    const updatePayload = merkle.payloads.updateTPSL({
      pair: params.positionId,
      userAddress: params.userAddress,
      isLong: position.isLong,
      takeProfitTriggerPrice: BigInt(params.tpPriceInQuote * 10 ** 6),
      stopLossTriggerPrice: BigInt(params.slPriceInQuote * 10 ** 6),
    });

    return updatePayload;
  }
  async cancelOrder(
    params: PerpCloseParams
  ): Promise<MerkleCancelOrderPayload> {
    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);

    const orders = await merkle.getOrders({
      address: params.userAddress,
    });

    console.log("Open orders", orders);

    const order = orders.find((order) =>
      order.pairType.endsWith(params.positionId)
    );

    if (!order) {
      throw new Error(` ${params.positionId} order not found`);
    }

    // update position tp sl  position

    const cancelOrder = merkle.payloads.cancelOrder({
      pair: params.positionId,
      userAddress: params.userAddress,
      orderId: BigInt(order.orderId),
    });

    return cancelOrder;
  }
  async fetchOrder(params: PerpCloseParams): Promise<Order> {
    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);

    const orders = await merkle.getOrders({
      address: params.userAddress,
    });

    console.log("Open orders", orders);

    const order = orders.find((order) =>
      order.pairType.endsWith(params.positionId)
    );

    if (!order) {
      throw new Error(` ${params.positionId} order not found`);
    }

    return order;
  }
  async fetchPosition(params: PerpCloseParams): Promise<Position> {
    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const positions = await merkle.getPositions({
      address: params.userAddress,
    });

    console.log("Open positions", positions);

    const position = positions.find((position) =>
      position.pairType.endsWith(params.positionId)
    );

    if (!position) {
      throw new Error(` ${params.positionId} position not found`);
    }
    return position;
  }
  async listOpenPositions(params: PerpCloseParams): Promise<Position[]> {
    const merkle = new MerkleClient(
      params.mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const positions = await merkle.getPositions({
      address: params.userAddress,
    });

    console.log("Open positions", positions);

    if (!positions) {
      throw new Error(` no positions found`);
    }
    return positions;
  }
  async getTickerPrice(symbol: string, mainnet: boolean): Promise<number> {
    const merkle = new MerkleClient(
      mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    let summary = await merkle.api.getSummary();

    summary.prices.forEach((price) => {
      if (price.id.endsWith(symbol)) {
        return price;
      }
    });

    return 0;
  }
  async getBalance(mainnet: boolean, userAddress: string): Promise<Balance[]> {
    const merkle = new MerkleClient(
      mainnet
        ? await MerkleClientConfig.mainnet()
        : await MerkleClientConfig.testnet()
    );
    const aptos = new Aptos(merkle.config.aptosConfig);
    const balances: Balance[] = [];

    try {
      // Get native APT balance
      const accountInfo = await aptos.getAccountAPTAmount({
        accountAddress: userAddress,
      });

      balances.push({
        asset: "APT",
        amount: accountInfo / 10 ** 8,
      });
    } catch (error) {
      console.error("Error fetching native balance:", error);
    }

    try {
      // Get other token balances
      const tokens = await aptos.getAccountOwnedTokens({
        accountAddress: userAddress,
      });
      for (const token of tokens) {
        if (token.amount > 0) {
          const asset = token.current_token_data?.token_name
            ? token.current_token_data?.token_name
            : "Unknown";
          balances.push({
            asset: asset,
            amount: token.amount / 10 ** token.current_token_data?.decimals,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching token balances:", error);
    }

    return balances;
  }
  getFundingRate?(symbol: string): Promise<number | null> {
    throw new Error("Method not implemented.");
  }
}
