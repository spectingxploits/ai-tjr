import { Balance } from "@/models/interfaces";
import { SwapConnector } from "../connector";
import { HyperionSDK, initHyperionSDK } from "@hyperionxyz/sdk";
import { Network } from "@aptos-labs/ts-sdk";
import { PairPriceParams, SwapParams } from "@/models/hyperion/types";
import {
  PoolInfo,
  TokenInfo,
  SwapPayloadResult,
} from "@/models/hyperion/types";

export class HyperionConnector implements SwapConnector {
  name = "hyperion_connector";
  network: Network.MAINNET | Network.TESTNET;
  hyperionAdapter: HyperionSDK;

  constructor(network: Network.MAINNET | Network.TESTNET) {
    this.network = network;
    const apiKey =
      (this.network === Network.MAINNET
        ? process.env.APTOS_API_KEY_MAINNET
        : process.env.APTOS_API_KEY_TESTNET) || "";

    if (!apiKey) {
      console.warn(`[HyperionConnector] Missing API key for ${this.network}`);
    }

    this.hyperionAdapter = initHyperionSDK({
      network: this.network,
      APTOS_API_KEY: apiKey,
    });
  }

  async getQuote(params: PairPriceParams): Promise<number> {
    try {
      console.info("[HyperionConnector] Fetching pools...");
      const pools = await this.hyperionAdapter.Pool.fetchAllPools();

      const pool = pools.find(
        (p: any) =>
          p.pool.token1Info.symbol === params.symbolIn &&
          p.pool.token2Info.symbol === params.symbolOut
      );

      if (!pool) {
        throw new Error(
          `No pool found for ${params.symbolIn} -> ${params.symbolOut}`
        );
      }

      return pool.pool.currentTick;
    } catch (err) {
      console.error("[HyperionConnector] getQuote error:", err);
      throw err;
    }
  }

  async swap(params: SwapParams): Promise<SwapPayloadResult> {
    try {
      const poolInfo = await this.getPoolInfoByPair(
        params.symbolIn,
        params.symbolOut
      );
      if (!poolInfo) {
        throw new Error(
          `No pool found for ${params.symbolIn} -> ${params.symbolOut}`
        );
      }

      const tokenA: TokenInfo = poolInfo.token1Info;
      const tokenB: TokenInfo = poolInfo.token2Info;

      const tokenIn = tokenA.symbol === params.symbolIn ? tokenA : tokenB;
      const tokenOut = tokenA.symbol === params.symbolIn ? tokenB : tokenA;

      const currencyAAmount = params.amountIn * 10 ** tokenIn.decimals;

      const { amountOut: currencyBAmount, path: poolRoute } =
        await this.hyperionAdapter.Swap.estToAmount({
          amount: currencyAAmount,
          from: tokenIn.address,
          to: tokenOut.address,
          safeMode: false,
        });

      const swapParams = {
        currencyA: tokenIn.address,
        currencyB: tokenOut.address,
        currencyAAmount,
        currencyBAmount,
        slippage: 0.1,
        poolRoute,
        recipient: params.userAddress,
      };

      const payload = await this.hyperionAdapter.Swap.swapTransactionPayload(
        swapParams
      );

      return { payload };
    } catch (err) {
      console.error("[HyperionConnector] swap error:", err);
      throw err;
    }
  }

  async getPoolInfoByPair(tokenA: string, tokenB: string): Promise<PoolInfo> {
    try {
      const pools = await this.hyperionAdapter.Pool.fetchAllPools();
      const pool = pools.find((p: any) => {
        const t1 = p.pool.token1Info.symbol;
        const t2 = p.pool.token2Info.symbol;
        return (
          (t1 === tokenA && t2 === tokenB) || (t1 === tokenB && t2 === tokenA)
        );
      });

      if (!pool) {
        throw new Error(`No pool found for ${tokenA} -> ${tokenB}`);
      }

      return pool.pool;
    } catch (err) {
      console.error("[HyperionConnector] getPoolInfoByPair error:", err);
      throw err;
    }
  }

  async getBalance(_mainnet: boolean, userAddress: string): Promise<Balance[]> {
    const balances: Balance[] = [];

    try {
      // Native APT balance
      const accountInfo =
        await this.hyperionAdapter.AptosClient.getAccountAPTAmount({
          accountAddress: userAddress,
        });

      balances.push({
        asset: "APT",
        amount: accountInfo / 10 ** 8,
      });
    } catch (err) {
      console.error("[HyperionConnector] Error fetching native balance:", err);
    }

    try {
      // Token balances
      const tokens =
        await this.hyperionAdapter.AptosClient.getAccountOwnedTokens({
          accountAddress: userAddress,
        });

      for (const token of tokens) {
        if (token.amount > 0 && token.current_token_data) {
          const { token_name, decimals } = token.current_token_data;
          balances.push({
            asset: token_name || "Unknown",
            amount: token.amount / 10 ** (decimals || 0),
          });
        }
      }
    } catch (err) {
      console.error("[HyperionConnector] Error fetching token balances:", err);
    }

    return balances;
  }

  estimateGas?(
    _symbolIn: string,
    _symbolOut: string,
    _amount: number
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }
}
