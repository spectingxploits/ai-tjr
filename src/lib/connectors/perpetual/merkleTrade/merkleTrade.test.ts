import { describe, it, expect, beforeAll } from "vitest";
import { MerkleTradeConnector } from "./merkleTrade";
import { Network } from "@aptos-labs/ts-sdk";
import {
  PerpOpenParams,
  PerpCloseParams,
  PerpTP_SLParams,
} from "@/models/interfaces";

describe("MerkleTradeConnector integration", () => {
  let connector: MerkleTradeConnector;
  const testUser = "0x123..."; // replace with funded test address
  const mainnet = false;

  beforeAll(() => {
    connector = new MerkleTradeConnector(Network.TESTNET);
  });

  describe("open positions", () => {
    it("should open a long position (market)", async () => {
      const params: PerpOpenParams = {
        base: "APT",
        quote: "USDC",
        size_in_quote: 10,
        leverage: 2,
        entryType: "market",
        userAddress: testUser,
        mainnet,
        side: "long",
      };

      const result = await connector.openLong(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("payload");
      }
    });

    it("should fail if entryType is invalid", async () => {
      const params = {
        base: "APT",
        quote: "USDC",
        size_in_quote: 10,
        leverage: 2,
        entryType: "invalid",
        userAddress: testUser,
        mainnet,
        side: "long",
      } as unknown as PerpOpenParams;

      const result = await connector.openLong(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/entryType must be market or limit/);
      }
    });
  });

  describe("close positions", () => {
    it("should close a long position if found", async () => {
      const params: PerpCloseParams = {
        positionId: "APT_USDC",
        userAddress: testUser,
        mainnet,
      };

      const result = await connector.closeLong(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("payload");
      }
    });

    it("should return error if position not found", async () => {
      const params: PerpCloseParams = {
        positionId: "FAKE_ID",
        userAddress: testUser,
        mainnet,
      };

      const result = await connector.closeLong(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/not found/);
      }
    });
  });

  describe("TP/SL", () => {
    it("should set TP/SL for an open position", async () => {
      const params: PerpTP_SLParams = {
        positionId: "APT_USDC",
        userAddress: testUser,
        mainnet,
        tpPriceInQuote: 8,
        slPriceInQuote: 5,
      };

      const result = await connector.setTP_SL(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("payload");
      }
    });
  });

  describe("orders", () => {
    it("should cancel an order", async () => {
      const params: PerpCloseParams = {
        positionId: "APT_USDC",
        userAddress: testUser,
        mainnet,
      };

      const result = await connector.cancelOrder(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("payload");
      }
    });

    it("should fetch an order if it exists", async () => {
      const params: PerpCloseParams = {
        positionId: "APT_USDC",
        userAddress: testUser,
        mainnet,
      };

      const result = await connector.fetchOrder(params);
      if (result.success) {
        expect(result.data).toHaveProperty("orderId");
      } else {
        expect(result.error).toMatch(/not found/);
      }
    });
  });

  describe("positions", () => {
    it("should fetch a position", async () => {
      const params: PerpCloseParams = {
        positionId: "APT_USDC",
        userAddress: testUser,
        mainnet,
      };

      const result = await connector.fetchPosition(params);
      if (result.success) {
        expect(result.data).toHaveProperty("size");
      } else {
        expect(result.error).toMatch(/not found/);
      }
    });

    it("should list open positions", async () => {
      const params: PerpCloseParams = {
        positionId: "",
        userAddress: testUser,
        mainnet,
      };

      const result = await connector.listOpenPositions(params);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      } else {
        expect(result.error).toMatch(/No positions found/);
      }
    });
  });

  describe("market data", () => {
    it("should fetch ticker price", async () => {
      const result = await connector.getTickerPrice("APT_USDC", mainnet);
      if (result.success) {
        expect(typeof result.data).toBe("number");
      } else {
        expect(result.error).toMatch(/not found/);
      }
    });

    it("should fetch balances", async () => {
      const result = await connector.getBalance(mainnet, testUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });
  });
});
