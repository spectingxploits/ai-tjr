import { Quote, SwapResult } from "@/models/interfaces";
import { SwapConnector } from "../connector";
import { FeeTierIndex, HyperionSDK, initHyperionSDK } from "@hyperionxyz/sdk";

import { Network } from "@aptos-labs/ts-sdk";

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

  async getQuote(
    symbolIn: string,
    symbolOut: string,
    amount: number,
    opts?: { exactIn?: boolean; slippagePct?: number }
  ): Promise<number> {
    console.warn("Getting quote from Hyperion...");
    // Get pool data

    const pools = await this.hyperionAdapter.Pool.fetchAllPools();
    console.warn(pools.length);
    const pool = pools.find((pool: any) => {
      console.warn(pool.pool.token1Info.symbol!, pool.pool.token2Info.symbol!);
      return (
        pool.pool.token1Info.symbol === symbolIn &&
        pool.pool.token2Info.symbol === symbolOut
      );
    });
    if (!pool) {
      throw new Error(`No pool found for ${symbolIn} -> ${symbolOut}`);
    }
    console.warn("this is the pool", pool);


    return pool.pool.currentTick;
  }
  swapExactIn(
    symbolIn: string,
    symbolOut: string,
    amountIn: number,
    opts?: {
      slippagePct?: number;
      recipient?: string;
      deadlineSecs?: number;
      meta?: any;
    }
  ): Promise<SwapResult> {
    throw new Error("Method not implemented.");
  }
  swapExactOut(
    symbolIn: string,
    symbolOut: string,
    amountOut: number,
    opts?: {
      slippagePct?: number;
      recipient?: string;
      deadlineSecs?: number;
      meta?: any;
    }
  ): Promise<SwapResult> {
    throw new Error("Method not implemented.");
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
