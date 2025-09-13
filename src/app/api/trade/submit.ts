// pages/api/miniapp/submit.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

// In-memory DB for demo
const db: any = {};
const SERVER_PUBLIC_KEY = process.env.SERVER_PUBLIC_KEY!;
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { apiKey, secretKey, tradingPassword, userId } = req.body;

  // 1) Generate user key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

  // 2) Encrypt credentials with derived key from trading password
  const key = crypto.createHash("sha256").update(tradingPassword).digest(); // simple KDF
  const cipher = crypto.createCipheriv("aes-256-gcm", key, Buffer.alloc(12, 0));
  const credsEncrypted = Buffer.concat([cipher.update(JSON.stringify({ apiKey, secretKey })), cipher.final()]);
  
  // 3) Encrypt user private key with server public key
  const serverPub = crypto.createPublicKey(SERVER_PUBLIC_KEY);
  const userPrivateEncrypted = crypto.publicEncrypt(serverPub, privateKey.export({ type: "pkcs1", format: "pem" }));

  // 4) Store encrypted blobs
  db[userId] = { credsEncrypted, userPrivateEncrypted };

  res.json({ ok: true });
}
