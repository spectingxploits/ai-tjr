import {
  PairPriceParams,
  SwapParams,
  TokenInfo,
} from "@/models/hyperion/types";
import {
  Balance,
  GlobalPayload,
  OrderResult,
  PerpCloseParams,
  PerpOpenParams,
  PerpTP_SLParams,
  SignAndSubmitParams,
  SingAndSubmitResponse,
  TimeInForce,
  Tokens,
} from "@/models/interfaces";
import {
  MerkleCancelOrderPayload,
  MerkleTradePayload,
  MerkleUpdatePayload,
} from "@/models/merkleTrade/models";
import { Order, Position } from "@merkletrade/ts-sdk";
import { MerkleTradeConnector } from "./perpetual/merkleTrade/merkleTrade";
import { HyperionConnector } from "./spot/hyperion/hyperion";
import { Network } from "@aptos-labs/ts-sdk";
/** Standardized response wrapper for safer integrations */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PerpConnector {
  readonly name: string;

  init(): Promise<any>;
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
  getTokens(updateTokenList: boolean): Promise<Result<Tokens>>;
}

export interface SwapConnector {
  readonly name: string;
  init(): Promise<any>;
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
  getTokens(updateTokenList: boolean): Promise<Result<Tokens>>;
}

// this class has the responsibility of managing the connectors to sing and submit transactions
// and then syncs the database with the tx data

// 1) declare the runtime instance types
type PerpCtor = new (
  network: Network.MAINNET | Network.TESTNET
) => PerpConnector;
type SpotCtor = new (
  network: Network.MAINNET | Network.TESTNET
) => SwapConnector;

// 2) static registry of constructors (same as before)
export class ConnectorGateway {
  network: Network.MAINNET | Network.TESTNET;

  // instance fields we'll populate — declare them as optional so TS is happy before init
  merkle?: PerpConnector;
  hyperion?: SwapConnector;

  private spotConnectors: SwapConnector[] = [];
  private perpConnectors: PerpConnector[] = [];

  static AvailableConnectors = {
    perp: {
      merkle: MerkleTradeConnector as PerpCtor,
    },
    spot: {
      hyperion: HyperionConnector as SpotCtor,
    },
  };

  constructor(network: Network.MAINNET | Network.TESTNET) {
    this.network = network;
  }

  async initGatewayConnectors() {
    for (const [name, Ctor] of Object.entries(
      ConnectorGateway.AvailableConnectors.spot
    )) {
      const inst = new (Ctor as SpotCtor)(this.network);
      if (inst.init) await inst.init();
      // assign to typed class property
      (this as any)[name] = inst; // one small `any` cast at assignment time
      this.spotConnectors.push(inst);
    }

    for (const [name, Ctor] of Object.entries(
      ConnectorGateway.AvailableConnectors.perp
    )) {
      const inst = new (Ctor as PerpCtor)(this.network);
      if (inst.init) await inst.init();
      (this as any)[name] = inst;
      this.perpConnectors.push(inst);
    }
  }

  // optional helpers
  getSpotConnectors() {
    return this.spotConnectors;
  }
  getPerpConnectors() {
    return this.perpConnectors;
  }
}
