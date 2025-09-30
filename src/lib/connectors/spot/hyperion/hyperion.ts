import { Balance, Tokens } from "@/models/interfaces";
import { Result, SwapConnector } from "../../connector";
import { HyperionSDK, initHyperionSDK } from "@hyperionxyz/sdk";
import { Network } from "@aptos-labs/ts-sdk";
import {
  PairPriceParams,
  SwapParams,
  HyperionSwapPayload,
} from "@/models/hyperion/types";
import { PoolInfo, TokenInfo } from "@/models/hyperion/types";
import path from "path";
import fs from "fs";
export class HyperionConnector implements SwapConnector {
  name = "hyperion_swap_connector";
  network: Network.MAINNET | Network.TESTNET;
  private hyperionAdapter: HyperionSDK;

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

    console.log("inited the hyperion sdk");
  }

  init(): Promise<any> {
    return Promise.resolve();
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

      return Number(pool.pool.currentTick) / 10 ** 6;
    } catch (err) {
      console.error("[HyperionConnector] getQuote error:", err);
      throw err;
    }
  }

  async swap(params: SwapParams): Promise<Result<HyperionSwapPayload>> {
    try {
      const poolInfo = await this.getPoolInfoByPair(
        params.symbolIn,
        params.symbolOut
      );
      console.log("poolInfo", poolInfo);
      if (!poolInfo) {
        throw new Error(
          `No pool found for ${params.symbolIn} -> ${params.symbolOut}`
        );
      }

      const tokenA: TokenInfo = poolInfo.token1Info;
      const tokenB: TokenInfo = poolInfo.token2Info;
      console.log("tokenA", tokenA);
      console.log("tokenB", tokenB);
      const tokenIn = tokenA.symbol === params.symbolIn ? tokenA : tokenB;
      const tokenOut = tokenA.symbol === params.symbolIn ? tokenB : tokenA;
      console.log("tokenIn", tokenIn);
      console.log("tokenOut", tokenOut);
      const currencyAAmount = params.amountIn * 10 ** tokenIn.decimals;

      const { amountOut: currencyBAmount, path: poolRoute } =
        await this.hyperionAdapter.Swap.estToAmount({
          amount: currencyAAmount,
          from: tokenIn.address,
          to: tokenOut.address,
          safeMode: true,
        });
      console.log("currencyBAmount", currencyBAmount);
      console.log("poolRoute", poolRoute);
      const swapParams = {
        currencyA: tokenIn.address,
        currencyB: tokenOut.address,
        currencyAAmount,
        currencyBAmount,
        slippage: 0.1,
        poolRoute,
        recipient: params.userAddress,
      };
      console.log("swapParams", swapParams);
      const payload = await this.hyperionAdapter.Swap.swapTransactionPayload(
        swapParams
      );
      console.log("payload", payload);

      return { success: true, data: payload as HyperionSwapPayload };
    } catch (err) {
      console.error("[HyperionConnector] swap error:", err);
      return { success: false, error: String(err) };
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

      return {
        token1Info: {
          address: pool.pool.token1Info.assetType || "",
          decimals: pool.pool.token1Info.decimals || 1,
          symbol: pool.pool.token1Info.symbol || "UNKNOWN",
          name: pool.pool.token1Info.name || "UNKNOWN",
        },
        token2Info: {
          address: pool.pool.token2Info.assetType || "",
          decimals: pool.pool.token2Info.decimals || 1,
          symbol: pool.pool.token2Info.symbol || "UNKNOWN",
          name: pool.pool.token2Info.name || "UNKNOWN",
        },
        currentTick: pool.pool.currentTick,
      };
    } catch (err) {
      console.error("[HyperionConnector] getPoolInfoByPair error:", err);
      throw err;
    }
  }

  async getBalance(
    _mainnet: boolean,
    userAddress: string
  ): Promise<Result<Balance[]>> {
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

    return Promise.resolve({ success: true, data: balances });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  estimateGas?(
    _symbolIn: string,
    _symbolOut: string,
    _amount: number
  ): Promise<number> {
    this.hyperionAdapter.Position.fetchAllPositionsByAddress;
    throw new Error("Method not implemented.");
  }

  async getTokens(updateTokenList: boolean = false): Promise<Result<Tokens>> {
    try {
      console.log("trying to fetch all the pools");
      const pools = await this.hyperionAdapter.Pool.fetchAllPools();
      console.log("this is the number of the pools", pools.length);
      // You can then extract the token information from the pools
      let tokens: Tokens = {};
      pools.forEach((p: any) => {
        const token1Info = {
          address: p.pool.token1Info.assetType || "",
          decimals: p.pool.token1Info.decimals || 1,
          symbol: p.pool.token1Info.symbol || "UNKNOWN",
          name: p.pool.token1Info.name || "UNKNOWN",
        };

        tokens[p.pool.token1Info.symbol] = token1Info;

        const token2Info = {
          address: p.pool.token2Info.assetType || "",
          decimals: p.pool.token2Info.decimals || 1,
          symbol: p.pool.token2Info.symbol || "UNKNOWN",
          name: p.pool.token2Info.name || "UNKNOWN",
        };

        tokens[p.pool.token2Info.symbol] = token2Info;
      });

      // writing to the tokens.ts file if update was true
      if (updateTokenList) {
        console.log(`writing to the token_${this.network}.ts file`);
        const tokensFilePath = path.join(
          process.cwd(),
          "src",
          "models",
          "hyperion",
          `tokens_${this.network}.ts`
        );
        fs.writeFileSync(
          tokensFilePath,
          `export const tokens = ` + JSON.stringify(tokens, null, 2)
        );
      } else {
        console.log("tokens", tokens);
      }
      return Promise.resolve({ success: true, data: tokens });
    } catch (e) {
      console.error("getTokens failed:", e);
      return Promise.reject(e);
    }
  }

  async isTokenSupported(symbol: string): Promise<boolean> {
    try {
      const pools = await this.hyperionAdapter.Pool.fetchAllPools();
      const pool = pools.find((p: any) => {
        const t1 = p.pool.token1Info.symbol;
        const t2 = p.pool.token2Info.symbol;
        return (
          (t1 === symbol && t2 === symbol) || (t1 === symbol && t2 === symbol)
        );
      });
      return pool != null;
    } catch (err) {
      console.error("[HyperionConnector] isTokenSupported error:", err);
      throw err;
    }
  }

  async isPairSupported(base: string, quote: string): Promise<Result<boolean>> {
    try {
      const pools = await this.hyperionAdapter.Pool.fetchAllPools();
      const pool = pools.find((p: any) => {
        const t1 = p.pool.token1Info.symbol;
        const t2 = p.pool.token2Info.symbol;
        return (t1 === base && t2 === quote) || (t1 === quote && t2 === base);
      });
      if (!pool) {
        console.log("no pair found in hyperion");
        return Promise.resolve({ success: false, error: "No pool found" });
      } else {
        console.log("found pair in hyperion", pool.pool);
        return Promise.resolve({ success: true, data: true });
      }
    } catch (err) {
      console.error("[HyperionConnector] isPairSupported error:", err);
      return Promise.reject(err);
    }
  }

  getCustomQuotes(): { symbol: string; decimals: number }[] {
    return [
      {
        symbol: "USDT",
        decimals: 6,
      },
    ];
  }
}
