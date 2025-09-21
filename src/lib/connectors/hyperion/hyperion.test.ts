import { describe, it, expect, beforeAll } from "vitest";
import { HyperionConnector } from "./hyperion";
import { Network } from "@aptos-labs/ts-sdk";
import { SwapParams } from "@/models/hyperion/types";

const USER_ADDRESS = process.env.TESTNET_USER_ADDRESS || ""; // Provide a funded Aptos account for balance tests

describe("HyperionConnector integration", () => {
  let connector: HyperionConnector;

  beforeAll(() => {
    connector = new HyperionConnector(Network.TESTNET);
  });

  it("should fetch a quote for a real pool (APT → USDC)", async () => {
    const result = await connector.getQuote({
      symbolIn: "APT",
      symbolOut: "USDC",
      amount: 1_000_000, // 0.01 APT if decimals = 8
    });

    console.log("Quote result:", result);

    expect(result).toBeDefined();
    expect(typeof result).toBe("number");
  });

  it("should fetch pool info for APT → USDC", async () => {
    const poolInfo = await connector.getPoolInfoByPair("APT", "USDC");

    console.log("Pool info:", {
      token1: poolInfo.token1Info.symbol,
      token2: poolInfo.token2Info.symbol,
    });

    expect(poolInfo).toHaveProperty("token1Info");
    expect(poolInfo).toHaveProperty("token2Info");
    expect(poolInfo.token1Info).toHaveProperty("symbol");
    expect(poolInfo.token2Info).toHaveProperty("symbol");
  });

  it("should build a swap transaction payload (APT → USDC)", async () => {
    const params: SwapParams = {
      symbolIn: "APT",
      symbolOut: "USDC",
      amountIn: 0.01, // human-readable
      userAddress: USER_ADDRESS || "0x1", // dummy or real address
    };

    const result = await connector.swap(params);

    console.log("Swap payload result:", result);

    expect(result).toHaveProperty("payload");
    expect(result.payload).toBeDefined();
  });

  it("should fetch balances for a user", async () => {
    if (!USER_ADDRESS) {
      console.warn(
        "⚠️ Skipping balance test (no TESTNET_USER_ADDRESS provided)"
      );
      return;
    }

    const balances = await connector.getBalance(true, USER_ADDRESS);

    console.log("Balances:", balances);

    expect(Array.isArray(balances)).toBe(true);
    expect(balances.some((b) => b.asset === "APT")).toBe(true);
  });

  it("should throw an error when estimating gas", async () => {
    await expect(connector.estimateGas?.("APT", "USDC", 1)).rejects.toThrow(
      "Method not implemented."
    );
  });
});
