import { PairPriceParams, SwapParams } from "@/models/hyperion/types";
import {
  Balance,
  BasePosition,
  OrderResult,
  PerpCloseParams,
  PerpOpenParams,
  PerpTP_SLParams,
  Quote,
  SwapResult,
  TimeInForce,
} from "@/models/interfaces";
import {
  MerkleCancelOrderPayload,
  MerkleTradePayload,
  MerkleUpdatePayload,
} from "@/models/merkleTrade/models";
import { Order, Position } from "@merkletrade/ts-sdk";
/** Standardized response wrapper for safer integrations */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PerpConnector {
  readonly name: string;

  /* Spot helpers (optional; some perp exchanges also allow spot) */
  buySpot?(symbol: string, qty: number, price?: number): Promise<OrderResult>;
  sellSpot?(symbol: string, qty: number, price?: number): Promise<OrderResult>;

  openLong(params: PerpOpenParams): Promise<Result<MerkleTradePayload>>;
  openShort(params: PerpOpenParams): Promise<Result<MerkleTradePayload>>;

  closeLong(params: PerpCloseParams): Promise<Result<MerkleTradePayload>>;
  closeShort(params: PerpCloseParams): Promise<Result<MerkleTradePayload>>;

  /* Modify/auxiliary */
  setLeverage?(symbol: string, leverage: number): Promise<boolean>;
  setTP_SL?(params: PerpTP_SLParams): Promise<Result<MerkleUpdatePayload>>;
  cancelOrder(
    params: PerpCloseParams
  ): Promise<Result<MerkleCancelOrderPayload>>;
  fetchOrder(params: PerpCloseParams): Promise<Result<Order>>;
  fetchPosition(params: PerpCloseParams): Promise<Result<Position>>;
  listOpenPositions(params: PerpCloseParams): Promise<Result<Position[]>>;

  /* market data & account */
  getTickerPrice(symbol: string, mainnet: boolean): Promise<Result<number>>;
  getBalance(mainnet: boolean, userAddress: string): Promise<Result<Balance[]>>;
  getFundingRate?(symbol: string): Promise<number | null>;
}

export interface SwapConnector {
  readonly name: string;

  /* Get on-chain quote for exact in or exact out */ // price
  getQuote(params: PairPriceParams): Promise<number>;

  /* Execute swaps (wallet signing / chain broadcast handled by implementor) */
  swap(params: SwapParams): Promise<{ payload: any }>;

  /* Helpers */
  getPoolInfo?(symbolIn: string, symbolOut: string): Promise<any>;
  getTokenBalance?(address: string, token: string): Promise<number>;
  estimateGas?(
    symbolIn: string,
    symbolOut: string,
    amount: number
  ): Promise<number>;
}
