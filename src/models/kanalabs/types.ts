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
