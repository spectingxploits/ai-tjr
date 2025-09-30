import { getUser } from "@/services/db/user";
import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import dotenv from "dotenv";
dotenv.config();

import { base64UrlToU8, strip0x } from "@/lib/helpers/cryptoHelpers";

export function decryptData(payloadBase64Url: string): Uint8Array {
  const adminSecretHex = strip0x(process.env.ADMIN_KEY);
  if (!adminSecretHex) {
    throw new Error("ADMIN_KEY not set");
  }
  const adminSecret = base64HexToU8(adminSecretHex); // helper below
  if (adminSecret.length !== 32)
    throw new Error("admin secret must be 32 bytes");

  const combined = base64UrlToU8(payloadBase64Url);
  if (combined.length < 32 + 24 + 1) throw new Error("payload too short");

  const ephPub = combined.slice(0, 32);
  const nonce = combined.slice(32, 32 + 24);
  const ciphertext = combined.slice(32 + 24);

  const decrypted = nacl.box.open(
    new Uint8Array(ciphertext),
    new Uint8Array(nonce),
    new Uint8Array(ephPub),
    new Uint8Array(adminSecret)
  );
  if (!decrypted) throw new Error("decryption failed");

  // decrypted is Uint8Array: the exact secretKeyBytes that client encrypted
  return new Uint8Array(decrypted);
}

/** small helper to convert hex -> Uint8Array (server) */
function base64HexToU8(hex: string) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(clean, "hex"));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user_tg_id = url.searchParams.get("user_tg_id");

  if (!user_tg_id) {
    return NextResponse.json(
      { success: false, message: "user_tg_id is required" },
      { status: 400 }
    );
  }

  try {
    const res = await getUser(String(user_tg_id));
    if (res === undefined) {
      return NextResponse.json(
        { ok: false, error: "unknown error" },
        { status: 500 }
      );
    }
    console.log("shared key", res.shared_pubkey);
    const shared_key = Buffer.from(res.shared_pubkey.slice(2), "hex");
    console.log("shared_key", shared_key);
    console.log("res.sec", res.sec);
    console.log("res.user_pub_key", res.user_pub_key);
    // decrypting the shared key
    const shared_sec = decryptData(res.sec);
    console.log(
      "derived public key",
      Buffer.from(
        nacl.box.keyPair.fromSecretKey(shared_sec).publicKey
      ).toString("hex")
    );
    const bef = nacl.box.before(shared_key, shared_sec);

    if (!bef) {
      return NextResponse.json(
        { ok: false, error: "unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      shared_key: Buffer.from(bef).toString("hex"),
      user_pub_key: res.user_pub_key,
    });
  } catch (err: any) {
    console.log("err", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
