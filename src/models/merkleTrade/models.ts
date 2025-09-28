import { AccountAddressInput } from "@aptos-labs/ts-sdk";
import * as _aptos_labs_ts_sdk from "@aptos-labs/ts-sdk";
import { AptosStandardPayload } from "../interfaces";
import { normalizeArgument } from "@/lib/helpers/utils";

export type MerkleTradePayload = {
  function: `0x${string}::managed_trading::place_order_v3`;
  typeArguments: string[];
  functionArguments: (bigint | boolean | AccountAddressInput)[];
  abi: _aptos_labs_ts_sdk.EntryFunctionABI;
};

export type MerkleUpdatePayload = {
  function: `0x${string}::managed_trading::update_position_tp_sl_v3`;
  typeArguments: string[];
  functionArguments: (bigint | boolean | AccountAddressInput)[];
  abi: _aptos_labs_ts_sdk.EntryFunctionABI;
};

export type MerkleCancelOrderPayload = {
  function: `0x${string}::managed_trading::cancel_order_v3`;
  typeArguments: string[];
  functionArguments: (bigint | `0x${string}`)[];
  abi: _aptos_labs_ts_sdk.EntryFunctionABI;
};

// Converter
export function MerkletoAptosStandardPayload(
  payload:
    | {
        function: `0x${string}::managed_trading::place_order_v3`;
        typeArguments: string[];
        functionArguments: (bigint | boolean | AccountAddressInput)[];
      }
    | {
        function: `0x${string}::managed_trading::update_position_tp_sl_v3`;
        typeArguments: string[];
        functionArguments: (bigint | boolean | AccountAddressInput)[];
      }
    | {
        function: `0x${string}::managed_trading::cancel_order_v3`;
        typeArguments: string[];
        functionArguments: (bigint | `0x${string}`)[];
      }
): AptosStandardPayload {
  return {
    type: "entry_function_payload",
    function: payload.function,
    type_arguments: payload.typeArguments,
    arguments: payload.functionArguments.map(normalizeArgument),
  };
}
