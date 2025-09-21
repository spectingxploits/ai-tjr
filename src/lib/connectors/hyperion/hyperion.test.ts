import { describe, it, expect } from "vitest";
import { HyperionConnector } from "./hyperion";
import { Network } from "@aptos-labs/ts-sdk";

describe("HyperionConnector integration", () => {
  it("should fetch a quote for a real pool (APT → USDT)", async () => {
    const connector = new HyperionConnector(Network.TESTNET);

    // this will query real data from Hyperion
    const result = await connector.getQuote({
      symbolIn: "APT",
      symbolOut: "USDC",
      amount: 1_000_000,
    }); // amount = 0.01 APT (6 decimals)

    console.log("Quote result:", result);

    expect(result).toBeTruthy();
    expect(Number.isInteger(result)).toBe(true); // ticks array from SDK
  });
});
