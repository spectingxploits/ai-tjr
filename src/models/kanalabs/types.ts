import { normalizeArgument } from "@/lib/helpers/utils";
import { AptosStandardPayload, FunctionArgument } from "../interfaces";

// the inner payload (data)
export interface KanalabsOrderPayload {
  function: `${string}::${string}::${string}`;
  functionArguments: FunctionArgument[];
  typeArguments: string[];
}

export function kanalabsToAptosStandardPayload(
  payload: KanalabsOrderPayload
): AptosStandardPayload {
  return {
    type: "entry_function_payload",
    function: payload.function,
    type_arguments: payload.typeArguments,
    arguments: payload.functionArguments.map(normalizeArgument),
  };
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

// types/kanaPerpsOrders.ts

/** Raw order shape as returned by Kana Perps REST API (snake_case) */
export interface KanaOrder {
  address: string;
  market_id: string;
  leverage: number;
  order_type: number;
  timestamp: number; // unix seconds
  price: string;
  total_size: string;
  remaining_size: string;
  order_value: string;
  order_id: string;
  trade_id?: string | null;
  last_updated: number;
  transaction_version: number;
}

/** API response wrapper for list of orders */
export interface KanaOrdersResponse {
  success: boolean;
  message?: string;
  data: KanaOrder[];
}

/** Parsed / normalized order with numeric fields converted and camelCase keys */
export interface ParsedKanaOrder {
  address: string;
  marketId: number;
  leverage: number;
  orderType: number;
  timestamp: number; // unix seconds
  price: number;
  totalSize: number;
  remainingSize: number;
  orderValue: number;
  orderId: string;
  tradeId?: string | null;
  lastUpdated: number;
  transactionVersion: number;
}

/** Helper: safely convert string -> number | null */
const toNum = (v: string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Parse a single KanaOrder into ParsedKanaOrder */
export function parseKanaOrder(o: KanaOrder): ParsedKanaOrder {
  return {
    address: o.address,
    marketId: Number(o.market_id),
    leverage: o.leverage,
    orderType: o.order_type,
    timestamp: o.timestamp,
    price: toNum(o.price) ?? 0,
    totalSize: toNum(o.total_size) ?? 0,
    remainingSize: toNum(o.remaining_size) ?? 0,
    orderValue: toNum(o.order_value) ?? 0,
    orderId: o.order_id,
    tradeId: o.trade_id ?? null,
    lastUpdated: o.last_updated,
    transactionVersion: o.transaction_version,
  };
}

/** Parse array helper */
export function parseKanaOrders(
  list: KanaOrder[] | undefined
): ParsedKanaOrder[] {
  if (!Array.isArray(list)) return [];
  return list.map(parseKanaOrder);
}

export interface KanaHistory {
  address: string;
  market_id: string; // API returns as string
  leverage: number;
  order_type: number;
  timestamp: number; // unix seconds
  is_market_order: boolean;
  size: string; // numeric string
  price: string; // numeric string
  order_value: string; // numeric string
  status: string; // e.g. "Open", "Closed"
  order_id: string;
  trade_id: string;
  last_updated: number; // unix seconds
  transaction_version: number;
}

/** API response wrapper for list of orders */
export interface KanaHistoryResponse {
  success: boolean;
  message?: string;
  data: KanaHistory[];
}

/** Parsed/normalized version */
export interface ParsedKanaHistory {
  address: string;
  marketId: number;
  leverage: number;
  orderType: number;
  timestamp: number;
  isMarketOrder: boolean;
  size: number;
  price: number;
  orderValue: number;
  status: string;
  orderId: string;
  tradeId: string;
  lastUpdated: number;
  transactionVersion: number;
}

export function parseKanaHistory(o: KanaHistory): ParsedKanaHistory {
  const toNum = (v: string | null): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    address: o.address,
    marketId: Number(o.market_id),
    leverage: o.leverage,
    orderType: o.order_type,
    timestamp: o.timestamp,
    isMarketOrder: o.is_market_order,
    size: toNum(o.size),
    price: toNum(o.price),
    orderValue: toNum(o.order_value),
    status: o.status,
    orderId: o.order_id,
    tradeId: o.trade_id,
    lastUpdated: o.last_updated,
    transactionVersion: o.transaction_version,
  };
}
