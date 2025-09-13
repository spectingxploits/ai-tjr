export interface GlobalSignal {
  enter: number | null;
  profit: number | null;
  loss: number | null;
  tp: number | null;
  sl: number | null;
  lq: number | null;
  leverage: number | null;
  long: boolean | null;
  symbol?: string | null;
  text?: string | null;
  aiDetectedSuccessRate?: number | null;
  reasons: string[];
}

export interface GeminiResponse {
  signalDetected: boolean;
  values: GlobalSignal | null;
}
export interface GeminiOpinion {
  successRate: number;
}
export type AnalyzeOptions = {
  budgetUSDT?: number; // default 100 USDT
  preferTpAsExit?: boolean; // use tp as exit when computing profit (default true)
  geminiSymbolSuffix?: string; // typically "usd" on Gemini, you can override
  geminiTimeoutMs?: number;
};

export type GeminiRequestOptions = {
  message: string;
  contents: string;
};
