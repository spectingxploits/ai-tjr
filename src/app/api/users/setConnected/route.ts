import { NextResponse } from "next/server";
import { setConnectedStatus } from "@/services/db/user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Request body:", body);
    const { user_tg_id, connected, shared_pubkey, wallet_address } = body;

    if (
      !user_tg_id ||
      connected === undefined ||
      shared_pubkey === undefined ||
      wallet_address === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "user_tg_id and connected and shared pubkey and the wallet address are required",
        },
        { status: 400 }
      );
    }

    const new_status = await setConnectedStatus(
      String(user_tg_id),
      Boolean(connected),
      shared_pubkey,
      wallet_address
    );

    if (!new_status) {
      return NextResponse.json(
        { ok: false, error: "unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, new_status });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
