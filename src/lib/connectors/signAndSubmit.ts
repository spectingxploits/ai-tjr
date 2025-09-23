import {
  SignAndSubmitParams,
  SingAndSubmitResponse,
} from "@/models/interfaces";

export abstract class signAndSubmit {
  connector_name:
    | "hyperion_swap_connector"
    | "kana_labs_perpetual_connector"
    | "merkle_trade_perpetual_connector";

  constructor(
    connector_name:
      | "hyperion_swap_connector"
      | "kana_labs_perpetual_connector"
      | "merkle_trade_perpetual_connector"
  ) {
    this.connector_name = connector_name;
  }

  async signAndSubmit(
    params: SignAndSubmitParams
  ): Promise<SingAndSubmitResponse> {
    // preparing the link to petra wallet fo tx confirmation

    return Promise.reject("signAndSubmit not implemented");
  }
}
