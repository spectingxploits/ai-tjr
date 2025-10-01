import {
  HyperionSwapPayload,
  hyperionToAptosStandardPayload,
} from "@/models/hyperion/types";
import {
  AptosStandardPayload,
  FunctionArgument,
  GlobalPayload,
} from "@/models/interfaces";
import {
  KanalabsOrderPayload,
  kanalabsToAptosStandardPayload,
} from "@/models/kanalabs/types";
import {
  MerkleCancelOrderPayload,
  MerkleTestTradePayload,
  merkletoAptosStandardPayload,
  MerkleTradePayload,
  MerkleUpdatePayload,
} from "@/models/merkleTrade/models";
import SuperJSON from "superjson";

// Utility: normalize arguments recursively
export function normalizeArgument(arg: FunctionArgument): FunctionArgument {
  if (arg === null || arg === undefined) return "null";
  if (typeof arg === "bigint") return arg.toString();
  if (typeof arg === "number") return Number(arg);
  if (typeof arg === "boolean") return arg.toString();
  if (typeof arg === "string") return arg;
  if (arg instanceof Uint8Array) return Buffer.from(arg).toString("hex");
  if (
    Array.isArray(arg) &&
    (arg as string[]).every((x) => typeof x === "string")
  ) {
    return arg;
  }
  if (
    Array.isArray(arg) &&
    (arg as boolean[]).every((x) => typeof x === "boolean")
  ) {
    return arg;
  }
  if (Array.isArray(arg)) return JSON.stringify(arg.map(normalizeArgument));
  if (typeof arg === "object") return JSON.stringify(arg);
  console.log(
    "Potential issue with arg, do not know how to handle the ",
    typeof arg
  );
  return String(arg);
}
export function toAptosStandardPayload(
  payload: GlobalPayload
): AptosStandardPayload {
  if (isMerklePayload(payload)) {
    return merkletoAptosStandardPayload(payload);
  }

  if (isKanalabsPayload(payload)) {
    return kanalabsToAptosStandardPayload(payload);
  }

  if (isHyperionPayload(payload)) {
    return hyperionToAptosStandardPayload(payload);
  }

  throw new Error("Payload not supported");
}

function isMerklePayload(
  payload: any
): payload is
  | MerkleTradePayload
  | MerkleUpdatePayload
  | MerkleTestTradePayload
  | MerkleCancelOrderPayload {
  return (
    typeof payload?.function === "string" &&
    (payload.function.includes("::managed_trading::") ||
      payload.function.includes("::test_trading::")) &&
    Array.isArray(payload?.functionArguments)
  );
}

function isKanalabsPayload(payload: any): payload is KanalabsOrderPayload {
  return (
    typeof payload?.function === "string" &&
    payload.function.includes("::perpetual_scripts::") &&
    Array.isArray(payload?.functionArguments)
  );
}

function isHyperionPayload(payload: any): payload is HyperionSwapPayload {
  return (
    typeof payload?.function === "string" &&
    payload.function.includes("::router_v3::swap_batch") &&
    Array.isArray(payload?.functionArguments)
  );
}
