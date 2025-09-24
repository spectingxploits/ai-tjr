import { TokenInfo } from "./hyperion/types";
import {
  MerkleCancelOrderPayload,
  MerkleTradePayload,
  MerkleUpdatePayload,
} from "./merkleTrade/models";

export interface GlobalSignal {
  market: boolean;
  enter: number | null;
  profit: number | null;
  loss: number | null;
  tp: number | null;
  sl: number | null;
  lq: number | null;
  leverage: number | null;
  long: boolean | null;
  symbol: string;
  text?: string | null;
  aiDetectedSuccessRate?: number | null;
  reasons: string[];
}

export type Tokens = Record<string, TokenInfo>;

export interface GeminiResponse {
  signalDetected: boolean;
  values: GlobalSignal | null;
}
export interface GeminiOpinion {
  successRate: number;
}

export type SetupExchangeCreds = {
  PrivEnc: string;
  credsEnc: string;
  exchange: string;
  userTgNumericId: number;
};

export type AnalyzeOptions = {
  budgetUSDT?: number; // default 100 USDT
  preferTpAsExit?: boolean; // use tp as exit when computing profit (default true)
  geminiSymbolSuffix?: string; // typically "usd" on Gemini, you can override
  geminiTimeoutMs?: number;
};

export type GeminiRequestOptions = {
  message: string;
  contents: string;
};

/// ---

export type User = {
  tg_id: number;
};

export type ExchangeCreds = {
  tg_id: number;
  creds_enc: string;
  priv_enc: string;
  exchange_name: string;
};
export type OrderSide = "buy" | "sell";
export type PositionSide = "long" | "short";
export type OrderType = "market" | "limit";
export type TimeInForce = "GTC" | "IOC" | "FOK" | undefined;

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type?: OrderType;
  quantity?: number; // base units or contract size
  price?: number; // limit price
  stopPrice?: number; // trigger price for stop orders
  reduceOnly?: boolean;
  postOnly?: boolean;
  tif?: TimeInForce;
  clientOrderId?: string;
  meta?: any;
}

export interface OrderResult {
  orderId: string;
  status: "new" | "open" | "partially_filled" | "filled" | "cancelled" | string;
  filledQty?: number;
  remainingQty?: number;
  avgPrice?: number;
  raw?: any;
}

/* -------------------------
   Perpetual / Futures Connector
   ------------------------- */

export interface PerpOpenParams {
  side: PositionSide; // long | short
  base: string;
  quote: string;
  size_in_quote: number; // typically stable coin amount
  mainnet: boolean; // for chains that need it (e.g. Aptos)
  userAddress: `0x${string}`; // for chains that need it (e.g. Aptos)
  entryType?: OrderType; // market or limit
  entryPrice?: number;
  leverage?: number; // e.g. 5, 10 (optional)
  tpPrice?: number;
  tpPct?: number; // alt: percentage based TP
  slPrice?: number;
  slPct?: number; // alt: percentage based SL
  reduceOnly?: boolean;
  // clientId?: string;
  meta?: any;
}

export interface PerpCloseParams {
  positionId: string; // position id or the pair name
  userAddress: `0x${string}`;
  mainnet: boolean; // for chains that need it (e.g. Aptos)
}

export interface PerpTP_SLParams {
  positionId: string; // position id or the pair name
  userAddress: `0x${string}`;
  mainnet: boolean; // for chains that need it (e.g. Aptos)
  tpPriceInQuote: number; // without decimals adjustment
  slPriceInQuote: number; // without decimals adjustment
}

// global for balance

export interface Balance {
  asset: string;
  amount: number;
}

// connector

export type  GlobalPayload =
  | MerkleTradePayload
  | MerkleUpdatePayload
  | MerkleCancelOrderPayload
  | any;

export type SignAndSubmitParams = {
  payload: GlobalPayload;
  userAddress: string;
  mainnet: boolean;
  connectorName:
    | "kana_labs_perpetual_connector"
    | "hyperion_swap_connector"
    | "merkle_trade_perpetual_connector";
  signal: GlobalSignal;
};

export type SingAndSubmitResponse = {
  success: boolean;
  error?: string;
  txHash?: string;
};
