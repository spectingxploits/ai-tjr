import { PairPriceParams, SwapParams } from "@/models/hyperion/models";
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

export interface PerpConnector {
  readonly name: string;

  /* Spot helpers (optional; some perp exchanges also allow spot) */
  buySpot?(symbol: string, qty: number, price?: number): Promise<OrderResult>;
  sellSpot?(symbol: string, qty: number, price?: number): Promise<OrderResult>;

  openLong(
    params: Omit<PerpOpenParams, "side"> & { side?: "long" }
  ): Promise<MerkleTradePayload>;
  openShort(
    params: Omit<PerpOpenParams, "side"> & { side?: "short" }
  ): Promise<MerkleTradePayload>;

  closeLong(params: PerpCloseParams): Promise<MerkleTradePayload>;
  closeShort(params: PerpCloseParams): Promise<MerkleTradePayload>;

  /* Modify/auxiliary */
  setLeverage?(symbol: string, leverage: number): Promise<boolean>;
  setTP_SL?(params: PerpTP_SLParams): Promise<MerkleUpdatePayload>;
  cancelOrder(params: PerpCloseParams): Promise<MerkleCancelOrderPayload>;
  fetchOrder(params: PerpCloseParams): Promise<Order>;
  fetchPosition(params: PerpCloseParams): Promise<Position>;
  listOpenPositions(params: PerpCloseParams): Promise<Position[]>;

  /* market data & account */
  getTickerPrice(symbol: string, mainnet: boolean): Promise<number>;
  getBalance(mainnet: boolean, userAddress: string): Promise<Balance[]>;
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
