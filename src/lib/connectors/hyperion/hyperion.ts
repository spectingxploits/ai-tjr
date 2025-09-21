import { Quote, SwapResult } from "@/models/interfaces";
import { SwapConnector } from "../connector";
import { FeeTierIndex, HyperionSDK, initHyperionSDK } from "@hyperionxyz/sdk";

import { Network } from "@aptos-labs/ts-sdk";
import { PairPriceParams, SwapParams } from "@/models/hyperion/models";

export class HyperionConnector implements SwapConnector {
  name: string = "hyperion_connector";
  network: Network.MAINNET | Network.TESTNET;
  hyperionAdapter: HyperionSDK;
  constructor(network: Network.MAINNET | Network.TESTNET) {
    this.network = network;
    this.hyperionAdapter = initHyperionSDK({
      network: this.network,
      APTOS_API_KEY:
        (this.network === Network.MAINNET
          ? process.env.APTOS_API_KEY_MAINNET
          : process.env.APTOS_API_KEY_TESTNET) || "",
    });
  }

  async getQuote(params: PairPriceParams): Promise<number> {
    console.warn("Getting quote from Hyperion...");
    // Get pool data

    const pools = await this.hyperionAdapter.Pool.fetchAllPools();
    console.warn(pools.length);
    const pool = pools.find((pool: any) => {
      console.warn(pool.pool.token1Info.symbol!, pool.pool.token2Info.symbol!);
      return (
        pool.pool.token1Info.symbol === params.symbolIn &&
        pool.pool.token2Info.symbol === params.symbolOut
      );
    });
    if (!pool) {
      throw new Error(
        `No pool found for ${params.symbolIn} -> ${params.symbolOut}`
      );
    }
    console.warn("this is the pool", pool);

    return pool.pool.currentTick;
  }
  async swap(params: SwapParams): Promise<{ payload: any }> {
    let poolInfo = await this.getPoolTokensInfo(
      params.symbolIn,
      params.symbolOut
    );

    if (!poolInfo) {
      throw new Error(
        `No pool found for ${params.symbolIn} -> ${params.symbolOut}`
      );
    }
    let tokenAInfo: {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
    } = {
      address: poolInfo.token1Info.assetType,
      decimals: poolInfo.token1Info.decimals,
      symbol: poolInfo.token1Info.symbol,
      name: poolInfo.token1Info.name,
    };
    let tokenBInfo: {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
    } = {
      address: poolInfo.token2Info.assetType,
      decimals: poolInfo.token2Info.decimals,
      symbol: poolInfo.token2Info.symbol,
      name: poolInfo.token2Info.name,
    };

    const currencyAAmount =
      params.amountIn *
      10 **
        (tokenAInfo.symbol == params.symbolIn
          ? tokenAInfo.decimals
          : tokenBInfo.decimals);
    const { amountOut: currencyBAmount, path: poolRoute } =
      await this.hyperionAdapter.Swap.estToAmount({
        amount: currencyAAmount,
        from:
          tokenAInfo.symbol == params.symbolIn
            ? tokenAInfo.address
            : tokenBInfo.address,
        to:
          tokenAInfo.symbol == params.symbolIn
            ? tokenBInfo.address
            : tokenAInfo.address,

        safeMode: false,
      });

    const swapParams = {
      currencyA:
        tokenAInfo.symbol == params.symbolIn
          ? tokenAInfo.address
          : tokenBInfo.address,
      currencyB:
        tokenAInfo.symbol == params.symbolIn
          ? tokenBInfo.address
          : tokenAInfo.address,
      currencyAAmount,
      currencyBAmount,
      slippage: 0.1,
      poolRoute,
      recipient: params.userAddress,
    };

    const payload = await this.hyperionAdapter.Swap.swapTransactionPayload(
      swapParams
    );

    console.log(payload);

    return { payload };
  }
  async getPoolTokensInfo(tokenA: string, tokenB: string): Promise<any> {
    const pools = await this.hyperionAdapter.Pool.fetchAllPools();
    const pool = pools.find((pool: any) => {
      return (
        pool.pool.token1Info.symbol === tokenA ||
        (pool.pool.token1Info.symbol === tokenB &&
          pool.pool.token2Info.symbol === tokenA) ||
        pool.pool.token2Info.symbol === tokenB
      );
    });

    if (!pool) {
      throw new Error(`No pool found for ${tokenA} -> ${tokenB}`);
    }
    return pool.pool;
  }
  getPoolInfo?(symbolIn: string, symbolOut: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
  getTokenBalance?(address: string, token: string): Promise<number> {
    throw new Error("Method not implemented.");
  }
  estimateGas?(
    symbolIn: string,
    symbolOut: string,
    amount: number
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }
}
