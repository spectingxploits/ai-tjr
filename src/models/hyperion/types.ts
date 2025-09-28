import { normalizeArgument } from "@/lib/helpers/utils";
import { AptosStandardPayload, FunctionArgument } from "../interfaces";

export type PairPriceParams = {
  symbolIn: string;
  symbolOut: string;
  amount: number;
  opts?: { exactIn?: boolean; slippagePct?: number };
};

export type SwapParams = {
  symbolIn: string;
  symbolOut: string;
  amountIn: number;
  userAddress: string;
  opts?: {
    slippagePct?: number;
    recipient?: string;
    deadlineSecs?: number;
    meta?: any;
  };
};

export type HyperionSwapPayload = {
  function: `${string}::${string}::${string}`;
  typeArguments: string[];
  functionArguments: FunctionArgument[];
};

export function hyperionToAptosStandardPayload(
  payload: HyperionSwapPayload
): AptosStandardPayload {
  return {
    type: "entry_function_payload",
    function: payload.function,
    type_arguments: payload.typeArguments,
    arguments: payload.functionArguments.map(normalizeArgument),
  };
}

// Pool information for a trading pair
export interface PoolInfo {
  token1Info: TokenInfo;
  token2Info: TokenInfo;
  currentTick: number;
}

// Token details
export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  marketId?: number | string;
}

// Result of swap estimation
export interface EstimatedSwap {
  amountOut: number;
  path: string[];
}

// Parameters used for a swap
export interface SwapExecutionParams {
  currencyA: string;
  currencyB: string;
  currencyAAmount: number;
  currencyBAmount: number;
  slippage: number;
  poolRoute: string[];
  recipient: string;
}

// Returned payload after preparing swap
export interface SwapPayloadResult {
  payload: any; // keep as `any` if SDK payload is opaque, or refine if SDK provides types
}
