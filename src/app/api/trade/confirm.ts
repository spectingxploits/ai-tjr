// pages/api/trade/confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const db: any = {}; // same DB reference
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { tradeRequestId, encryptedPassword } = req.body;

  try {
    // 1) Decrypt trading password with server private key
    const privKey = crypto.createPrivateKey(SERVER_PRIVATE_KEY);
    const decryptedPass = crypto.privateDecrypt(
      privKey,
      Buffer.from(encryptedPassword, "base64")
    );

    const tradingPassword = decryptedPass.toString();

    // 2) Retrieve encrypted blobs (userPrivateEncrypted + credsEncrypted)
    const userBlobs = db[tradeRequestId];
    if (!userBlobs)
      return res
        .status(400)
        .json({ ok: false, error: "Invalid trade request" });

    // 3) Decrypt user private key
    const userPriv = crypto.privateDecrypt(
      privKey,
      userBlobs.userPrivateEncrypted
    );

    // 4) Decrypt credentials using trading password
    const key = crypto.createHash("sha256").update(tradingPassword).digest();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.alloc(12, 0)
    );
    const creds = JSON.parse(
      Buffer.concat([
        decipher.update(userBlobs.credsEncrypted),
        decipher.final(),
      ]).toString()
    );

    // 5) Execute trade (pseudo)
    console.log("Trading with creds:", creds);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
