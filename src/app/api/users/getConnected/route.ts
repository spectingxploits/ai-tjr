import { NextResponse } from "next/server";
import { getConnectedStatus } from "@/services/db/user";
import { connect } from "http2";

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
    const res = await getConnectedStatus(String(user_tg_id));

    if (res === undefined) {
      return NextResponse.json(
        { ok: false, error: "unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      connected: res.connected,
      shared_pubkey: res.shared_pubkey,
      wallet_address: res.wallet_address,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
