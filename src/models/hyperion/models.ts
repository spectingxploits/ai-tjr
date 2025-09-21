export type PairPriceParams = {
  symbolIn: string;
  symbolOut: string;
  amount: number;
  opts?: { exactIn?: boolean; slippagePct?: number };
};

export type SwapParams = {
  symbolIn: string;
  symbolOut: string;
  amountIn: number;
  userAddress: string;
  opts?: {
    slippagePct?: number;
    recipient?: string;
    deadlineSecs?: number;
    meta?: any;
  };
};
