// kanaPerpsClient.ts
import axios, { AxiosInstance } from "axios";
import { PerpConnector, Result } from "../../connector";
import {
  Balance,
  OrderResult,
  PerpCloseParams,
  PerpOpenParams,
  PerpTP_SLParams,
  Tokens,
} from "@/models/interfaces";
import { signAndSubmit } from "../../signAndSubmit";
import {
  MerkleTradePayload,
  MerkleUpdatePayload,
  MerkleCancelOrderPayload,
} from "@/models/merkleTrade/models";
import { Order, Position } from "@merkletrade/ts-sdk";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import path from "path";
import fs from "fs";
import { KanalabsResponse } from "@/models/kanalabs/types";
export class KanalabsConnector extends signAndSubmit implements PerpConnector {
  name: string = "kanalabs_perpetual_connector";
  network: Network.MAINNET | Network.TESTNET;
  private kanalabsApi: AxiosInstance = {} as any;
  private baseUrl: string = {} as any;
  aptosClient: Aptos = {} as any;

  constructor(network: Network.MAINNET | Network.TESTNET) {
    super("kanalabs_perpetual_connector");
    this.network = network;
    let apiKey = process.env.KANALABS_API_KEY;
    if (!apiKey) {
      throw new Error("Missing API key for Kanalabs");
    }
    this.baseUrl =
      this.network === Network.MAINNET
        ? "https://perps-tradeapi.kana.trade"
        : "https://perps-tradeapi.kanalabs.io";
    this.kanalabsApi = axios.create({
      baseURL: this.baseUrl,
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
      timeout: 15_000,
    });
    let aptosSetting = new AptosConfig({ network: this.network });
    this.aptosClient = new Aptos(aptosSetting);
  }
  async init(): Promise<any> {
    return;
  }
  buySpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
    throw new Error("Method not implemented.");
  }
  sellSpot?(symbol: string, qty: number, price?: number): Promise<OrderResult> {
    throw new Error("Method not implemented.");
  }
  openLong(params: PerpOpenParams): Promise<Result<any>> {
    this.checkClients();
    // return this.openPerp({ ...params, side: "long" });
    return Promise.reject("openLong not implemented");
  }
  openShort(params: PerpOpenParams): Promise<Result<any>> {
    this.checkClients();
    // return this.openPerp({ ...params, side: "short" });
    return Promise.reject("openShort not implemented");
  }
  //   private async openPerp(params: PerpOpenParams): Promise<Result<any>> {
  //     if (params.entryType == "market") {
  //     } else if (params.entryType == "limit") {

  //     const params = {
  //         marketId: 501,
  //         tradeSide: ,
  //         direction: false,
  //         size: 1.5,
  //         price: 5.7,
  //         leverage: 2
  //     };
  //     const res = await axios.get(baseURL, {
  //         params, headers: {
  //             'x-api-key': process.env.API_KEY,
  //         },
  //     });
  //     const payloadData = res.data.data;
  //     const transactionPayload = await aptos.transaction.build.simple({
  //         sender: account.accountAddress,
  //         data: payloadData
  //     });
  //     const committedTxn = await aptos.transaction.signAndSubmitTransaction({
  //         transaction: transactionPayload,
  //         signer: account,
  //     });
  //     console.log(`Submitted transaction: ${committedTxn.hash}`);
  //     const response = await aptos.waitForTransaction({
  //         transactionHash: committedTxn.hash,
  //     });
  //     console.log("response", response.success);
  // }
  //     }
  //     return Promise.reject("order type is not supported");
  //   }
  closeLong(params: PerpCloseParams): Promise<Result<MerkleTradePayload>> {
    throw new Error("Method not implemented.");
  }
  closeShort(params: PerpCloseParams): Promise<Result<MerkleTradePayload>> {
    throw new Error("Method not implemented.");
  }
  setLeverage?(symbol: string, leverage: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setTP_SL?(params: PerpTP_SLParams): Promise<Result<MerkleUpdatePayload>> {
    throw new Error("Method not implemented.");
  }
  cancelOrder(
    params: PerpCloseParams
  ): Promise<Result<MerkleCancelOrderPayload>> {
    throw new Error("Method not implemented.");
  }
  fetchOrder(params: PerpCloseParams): Promise<Result<Order>> {
    throw new Error("Method not implemented.");
  }
  fetchPosition(params: PerpCloseParams): Promise<Result<Position>> {
    throw new Error("Method not implemented.");
  }
  listOpenPositions(params: PerpCloseParams): Promise<Result<Position[]>> {
    throw new Error("Method not implemented.");
  }
  getTickerPrice(symbol: string, mainnet: boolean): Promise<Result<number>> {
    throw new Error("Method not implemented.");
  }
  getBalance(
    mainnet: boolean,
    userAddress: string
  ): Promise<Result<Balance[]>> {
    throw new Error("Method not implemented.");
  }
  getFundingRate?(symbol: string): Promise<number | null> {
    throw new Error("Method not implemented.");
  }
  async getTokens(updateTokenList: boolean = false): Promise<Result<Tokens>> {
    try {
      this.checkClients();
      let token_response: KanalabsResponse = (
        await this.kanalabsApi.get("/getPerpetualAssetsInfo/allMarkets")
      ).data;
      //   console.log("token_response", token_response.data);
      if (!token_response) {
        return Promise.reject("No tokens found");
      }
      //   console.log(token_response)
      let tokens: Tokens = {};
      for (const token of token_response.data) {
        tokens[
          token.base_name.split(token.base_name.includes("-") ? "-" : "/")[0]
        ] = {
          address:
            "0x000000000000000000000000000000000000000000000000000000000000000d", // since its a deposit like dex the addresses don't exist, the market contract will handle the exchange and we don't save the market contract address.
          decimals: token.base_decimals,
          symbol: token.base_name.split("_")[0],
          name: token.base_name.split("_")[0],
          marketId: token.market_id,
        };
      }
      if (updateTokenList) {
        console.log(`writing to the token_${this.network}.ts file`);
        const tokensFilePath = path.join(
          process.cwd(),
          "src",
          "models",
          "kanalabs",
          `tokens_${this.network}.ts`
        );
        fs.writeFileSync(
          tokensFilePath,
          `export const tokens = ` + JSON.stringify(tokens, null, 2)
        );
      } else {
        console.log("not writing to the tokens.ts file");
      }
      return Promise.resolve({ success: true, data: tokens });
    } catch (e) {
      console.error("getTokens failed:", e);
      return Promise.reject(e);
    }
  }
  isPairSupported(base: string, quote: string): Promise<Result<boolean>> {
    throw new Error("Method not implemented.");
  }
  getCustomQuotes(): { symbol: string; decimals: number }[] {
    return [
      {
        symbol: "USDT",
        decimals: 6,
      },
    ];
  }
  private checkClients() {
    if (!this.kanalabsApi || !this.aptosClient) {
      throw new Error("KanaLabsClient and AptosClient not initialized");
    }
  }
}
