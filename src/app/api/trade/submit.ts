// pages/api/miniapp/submit.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { SetupExchangeCreds } from "@/models/interfaces";
import { setupUserExchangeData } from "@/app/controllers/wallet/setup";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { PrivEnc, credsEnc, exchange, userTgNumericId } =
    req.body as SetupExchangeCreds;
  try {
    let setupResponse = await setupUserExchangeData({
      tg_id: userTgNumericId,
      creds_enc: credsEnc,
      priv_enc: PrivEnc,
      exchange_name: exchange,
    });
    if (!setupResponse) {
      res.status(500).json({ ok: false, error: "unknown error" });
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
