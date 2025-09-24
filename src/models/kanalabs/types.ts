export type FunctionArgument = string | number | boolean;

// the inner payload (data)
export interface KanalabsOrderPayload {
  function: `${string}::${string}::${string}`;
  functionArguments: FunctionArgument[];
  typeArguments: string[];
}

export interface KanalabsOrderPayloadResponse {
  success: boolean;
  message: string;
  data: KanalabsOrderPayload;
}

export interface KanalabsResponse {
  success: boolean;
  message: string;
  data: any;
}

// types/kanaPerps.ts

/** Raw position shape as returned by the Kana Perps REST API (snake_case) */
export interface KanaPosition {
  address: string;
  market_id: string;
  leverage: number;
  trade_side: boolean;
  size: string;
  available_order_size: string;
  value: string;
  entry_price: string;
  liq_price: string;
  margin: string;
  tp: string | null;
  sl: string | null;
  trade_id: string;
  last_updated: number; // unix timestamp (seconds)
  transaction_version: number;
}

/** API response wrapper for list of positions */
export interface KanaPositionsResponse {
  success: boolean;
  message?: string;
  data: KanaPosition[];
}

/** Optional: parsed/normalized version where numeric strings are converted to numbers */
export interface ParsedKanaPosition {
  address: string;
  marketId: number;
  leverage: number;
  tradeSide: boolean;
  size: number;
  availableOrderSize: number;
  value: number;
  entryPrice: number;
  liqPrice: number;
  margin: number;
  tp: number | null;
  sl: number | null;
  tradeId: string;
  lastUpdated: number; // unix timestamp (seconds)
  transactionVersion: number;
}

export function parseKanaPosition(p: KanaPosition): ParsedKanaPosition {
  const toNum = (v: string | null): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    address: p.address,
    marketId: Number(p.market_id),
    leverage: p.leverage,
    tradeSide: p.trade_side,
    size: toNum(p.size) ?? 0,
    availableOrderSize: toNum(p.available_order_size) ?? 0,
    value: toNum(p.value) ?? 0,
    entryPrice: toNum(p.entry_price) ?? 0,
    liqPrice: toNum(p.liq_price) ?? 0,
    margin: toNum(p.margin) ?? 0,
    tp: toNum(p.tp),
    sl: toNum(p.sl),
    tradeId: p.trade_id,
    lastUpdated: p.last_updated,
    transactionVersion: p.transaction_version,
  };
}
