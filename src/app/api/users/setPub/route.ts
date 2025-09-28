import { setPubKey } from "@/services/db/user";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  console.log("Request body:", body);
  const { user_tg_id, pub } = body;

  if (!user_tg_id || !pub) {
    return NextResponse.json(
      {
        success: false,
        message: "user_tg_id and pub are required",
      },
      { status: 400 }
    );
  }

  if (!user_tg_id || !pub) {
    return NextResponse.json(
      { success: false, message: "user_tg_id and pub are required" },
      { status: 400 }
    );
  }

  try {
    let res = await setPubKey(String(user_tg_id), String(pub));
    if (res === undefined) {
      return NextResponse.json(
        { ok: false, error: "unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.log("err", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
