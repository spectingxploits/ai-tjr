import {
  PairPriceParams,
  PoolInfo,
  SwapParams,
  TokenInfo,
} from "@/models/hyperion/types";
import {
  Balance,
  GlobalOrders,
  GlobalPayload,
  GlobalPositions,
  GlobalSignal,
  OrderResult,
  PerpCloseParams,
  PerpOpenParams,
  PerpTP_SLParams,
  SignAndSubmitParams,
  SingAndSubmitResponse,
  TimeInForce,
  Tokens,
} from "@/models/interfaces";

import { Order, Position } from "@merkletrade/ts-sdk";
import { MerkleTradeConnector } from "./perpetual/merkleTrade/merkleTrade";
import { HyperionConnector } from "./spot/hyperion/hyperion";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { getUser } from "@/services/db/user";
import { connect } from "http2";
import { sendOpenSignPageButton } from "@/lib/responds/trade/confirmButton";
import SuperJSON from "superjson";
import { KanalabsConnector } from "./perpetual/kanalabs/kanalabs";
import { Context, InlineKeyboard } from "grammy";
import { I } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";
import { InlineKeyboardButton } from "grammy/types";
import { MESSAGES } from "../responds/messages";
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

  openLong(params: PerpOpenParams): Promise<Result<GlobalPayload>>;
  openShort(params: PerpOpenParams): Promise<Result<GlobalPayload>>;

  closeLong(params: PerpCloseParams): Promise<Result<GlobalPayload>>;
  closeShort(params: PerpCloseParams): Promise<Result<GlobalPayload>>;

  /* Modify/auxiliary */
  setLeverage?(symbol: string, leverage: number): Promise<boolean>;
  setTP_SL?(params: PerpTP_SLParams): Promise<Result<GlobalPayload>>;
  cancelOrder(
    orders: GlobalOrders,
    userAddress: `0x${string}`
  ): Promise<Result<GlobalPayload>>;
  listOpenOrders(userAddress: `0x${string}`): Promise<Result<GlobalOrders>>;
  fetchPosition(params: PerpCloseParams): Promise<Result<Position>>;
  listOpenPositions(
    userAddress: `0x${string}`
  ): Promise<Result<GlobalPositions>>;

  /* market data & account */
  getTickerPrice(symbol: string): Promise<Result<number>>;
  getBalance(mainnet: boolean, userAddress: string): Promise<Result<Balance[]>>;
  getFundingRate?(symbol: string): Promise<number | null>;
  getTokens(updateTokenList: boolean): Promise<Result<Tokens>>;
  isPairSupported(base: string, quote: string): Promise<Result<boolean>>;
  /**
   * This function returns a list of custom quotes supported by the exchange.
   * The default implementation should return ["USDT"].
   * For example the merkle trade exchange only supports trading token against USDC while the hyperion exchange supports USDT and other tokens as well.
   * @returns The list of custom quotes supported by the exchange
   */
  getCustomQuotes(): { symbol: string; decimals: number }[]; // default should return ["USDT"]
}

export interface SwapConnector {
  readonly name: string;
  init(): Promise<any>;
  /* Get on-chain quote for exact in or exact out */ // price
  getQuote(params: PairPriceParams): Promise<number>;

  /* Execute swaps (wallet signing / chain broadcast handled by implementor) */
  swap(params: SwapParams): Promise<Result<GlobalPayload>>;

  /* Helpers */
  getPoolInfoByPair(tokenA: string, tokenB: string): Promise<PoolInfo>;
  getTokenBalance?(address: string, token: string): Promise<number>;
  getBalance(mainnet: boolean, userAddress: string): Promise<Result<Balance[]>>;

  estimateGas?(
    symbolIn: string,
    symbolOut: string,
    amount: number
  ): Promise<number>;
  getTokens(updateTokenList: boolean): Promise<Result<Tokens>>;
  isPairSupported(base: string, quote: string): Promise<Result<boolean>>;
  /**
   * This function returns a list of custom quotes supported by the exchange.
   * The default implementation should return ["USDT"].
   * For example the merkle trade exchange only supports trading token against USDC while the hyperion exchange supports USDT and other tokens as well.
   * @returns The list of custom quotes supported by the exchange
   */
  getCustomQuotes(): { symbol: string; decimals: number }[]; // default should return ["USDT"]
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
  aptos?: Aptos;
  // instance fields we'll populate — declare them as optional so TS is happy before init
  merkle?: PerpConnector;
  hyperion?: SwapConnector;
  kanalabs?: PerpConnector;

  private spotConnectors: SwapConnector[] = [];
  private perpConnectors: PerpConnector[] = [];

  static AvailableConnectors = {
    perp: {
      merkle: MerkleTradeConnector as PerpCtor,
      kanalabs: KanalabsConnector as PerpCtor,
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
    const config = new AptosConfig({ network: this.network });

    this.aptos = new Aptos(config);
  }

  async handleIncomingSignal(
    ctx: Context,
    signal: GlobalSignal,
    user_chat_id: number,
    message_id: number,
    token: string
  ): Promise<Result<boolean>> {
    // getting the supported dexes
    let supportedSpotDexes: SwapConnector[] = [];
    for (const connector of this.spotConnectors) {
      if (
        (
          await connector.isPairSupported(
            signal.symbol,
            connector.getCustomQuotes()[0].symbol
          )
        ).success
      ) {
        supportedSpotDexes.push(connector);
      }
    }
    console.log(
      "supported spot dexes",
      supportedSpotDexes.map((d) => d.name)
    );
    let supportedPerpDexes: PerpConnector[] = [];
    for (const connector of this.perpConnectors) {
      if (
        (
          await connector.isPairSupported(
            signal.symbol,
            connector.getCustomQuotes()[0].symbol
          )
        ).success
      ) {
        supportedPerpDexes.push(connector);
      }
    }
    console.log(
      "supported perp dexes",
      supportedPerpDexes.map((d) => d.name)
    );

    if (supportedPerpDexes.length === 0 && supportedSpotDexes.length === 0) {
      return Promise.reject("No supported dexes found");
    }

    // fetching the user address
    let user_address: `0x${string}` = (await getUser(String(user_chat_id)))
      .wallet_address as `0x${string}`;

    if (!user_address) {
      return Promise.reject(
        "User address not found or users wallet not connected"
      );
    }

    // preparing the payload for the supported dexes
    let payloads: Record<string, GlobalPayload> = {};

    // the swaps only happen if the trade is market
    if (signal.market) {
      // for spot
      for (const connector of supportedSpotDexes) {
        console.log(
          "these are the params for the spot connector",
          connector.getCustomQuotes()[0].symbol,
          signal.symbol,
          (signal.lq ?? 10) * 10 ** connector.getCustomQuotes()[0].decimals,
          user_address
        );
        const payload = await connector.swap({
          symbolIn: connector.getCustomQuotes()[0].symbol,
          symbolOut: signal.symbol,
          amountIn:
            (signal.lq ?? 10) * 10 ** connector.getCustomQuotes()[0].decimals, // 10$ if no lq was provided
          userAddress: user_address,
        });
        if (!payload.success) {
          return Promise.reject(payload.error);
        }
        payloads[connector.name] = payload.data;
      }
    }

    // the perpetual and spot trades are supported even if the trade type is limit or even market
    // for perpetual
    for (const connector of supportedPerpDexes) {
      if (signal.long) {
        const payload = await connector.openLong({
          base: signal.symbol,
          quote: connector.getCustomQuotes()[0].symbol,
          size_in_quote: signal.lq ?? 10,
          userAddress: user_address,
          entryType: signal.market ? "market" : "limit",
          entryPrice: Number(signal.enter),
          leverage: signal.leverage ? Number(signal.leverage) : 1,
          tpPrice: Number(signal.tp),
          slPrice: Number(signal.sl),
          reduceOnly: false,
          side: "long",
          mainnet: this.network === Network.MAINNET,
        });
        if (!payload.success) {
          return Promise.reject(payload.error);
        }
        payloads[connector.name] = payload.data!;
      } else {
        const payload = await connector.openShort({
          base: signal.symbol,
          quote: connector.getCustomQuotes()[0].symbol,
          size_in_quote: signal.lq ?? 10,
          userAddress: user_address,
          entryType: signal.market ? "market" : "limit",
          entryPrice: Number(signal.enter),
          leverage: signal.leverage ? Number(signal.leverage) : 1,
          tpPrice: Number(signal.tp),
          slPrice: Number(signal.sl),
          reduceOnly: false,
          side: "short",
          mainnet: this.network === Network.MAINNET,
        });
        if (!payload.success) {
          return Promise.reject(payload.error);
        }
        payloads[connector.name] = payload.data!;
      }
    }

    // generating the sign and submit magic links
    let keyboard: InlineKeyboardButton[][] = []; // <-- 2D array
    type WRAPPER = SignAndSubmitParams & { telegramChatId?: string };

    for (const payload of Object.keys(payloads)) {
      let tempSignal: GlobalSignal | null = null;
      if (payload.includes("swap_connector")) {
        tempSignal = {
          market: true,
          enter: null,
          profit: null,
          loss: null,
          tp: null,
          sl: null,
          lq: signal.lq ?? 10,
          leverage: null,
          long: null,
          symbol: signal.symbol,
          aiDetectedSuccessRate: null,
          reasons: [],
        };
      }
      const wrapper: WRAPPER = {
        payload: payloads[payload],
        userAddress: user_address,
        mainnet: this.network === Network.MAINNET,
        connectorName: payload as any,
        signal: tempSignal ? tempSignal : signal,
        telegramChatId: String(user_chat_id), // added field
      };

      // encode the wrapper for safe URL transport
      const encoded = encodeURIComponent(SuperJSON.stringify(wrapper));

      const webAppUrl = `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/trade/sign?payload=${encoded}`;

      const parsed_connector_name = payload.split("_")[0];
      keyboard.push([
        {
          text: `Sign for ${parsed_connector_name}`,
          web_app: { url: webAppUrl },
        },
      ]);
    }

    keyboard.push([
      {
        text: "⬅️ Back",
        callback_data: `back_to_edit_and_confirm:${token}`,
      },
    ]);
    await ctx.api.editMessageText(
      user_chat_id,
      message_id,
      signal.text ?? "data not found",
      {
        reply_markup: {
          inline_keyboard: keyboard,
        },
        parse_mode: "HTML",
      }
    );

    return Promise.resolve({ success: true, data: true });
  }

  async getBalance(ctx: Context): Promise<Result<boolean>> {
    // get user address
    if (!ctx.chat?.id) {
      return Promise.reject("No chat id found");
    }
    let user_address: `0x${string}` = (await getUser(String(ctx.chat?.id)))
      .wallet_address as `0x${string}`;
    if (!user_address) {
      ctx.reply(" ❌ Please connect you wallet first");
      return Promise.resolve({ success: false, error: "No wallet connected" });
    }

    let message = await ctx.reply(
      ` ✅ Fetching balances for ${user_address.slice(0, 6)}...`
    );

    let balances: Record<string, Balance[]> = {};
    if (this.aptos == null) {
      return Promise.reject("Aptos not initialized");
    }

    let aptBal = await this.aptos.getAccountAPTAmount({
      accountAddress: user_address,
    });

    aptBal = aptBal / 10 ** 8;

    console.log("aptBal", aptBal);

    for (const connector of this.perpConnectors) {
      const res = await connector.getBalance(
        this.network == Network.MAINNET,
        user_address
      );
      if (!res.success) {
        ctx.reply(` ❌ ${res.error}`);
        return Promise.resolve({ success: false, error: res.error });
      }
      balances[connector.name] = res.data;
    }
    for (const connector of this.spotConnectors) {
      const res = await connector.getBalance(
        this.network == Network.MAINNET,
        user_address
      );
      if (!res.success) {
        ctx.reply(` ❌ ${res.error}`);
        return Promise.resolve({ success: false, error: res.error });
      }
      balances[connector.name] = res.data;
    }
    console.log("balances", balances);
    ctx.api.editMessageText(
      ctx.chat.id.toString(),
      message.message_id,
      MESSAGES.balances(balances, aptBal),
      {
        parse_mode: "HTML",
      }
    );
    return Promise.resolve({ success: true, data: true });
  }

  getSpotConnectors() {
    return this.spotConnectors;
  }
  getPerpConnectors() {
    return this.perpConnectors;
  }
}
