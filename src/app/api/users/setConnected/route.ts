import { NextResponse } from "next/server";
import { setConnectedStatus } from "@/services/db/user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Request body:", body);
    const { user_tg_id, connected } = body;

    if (!user_tg_id || connected === undefined) {
      return NextResponse.json(
        { success: false, message: "user_tg_id and connected are required" },
        { status: 400 }
      );
    }

    const new_status = await setConnectedStatus(
      Number(user_tg_id),
      Boolean(connected)
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
