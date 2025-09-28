import { NextResponse } from "next/server";
import { setSec } from "@/services/db/user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Request body:", body);
    const { user_tg_id, sec } = body;

    if (!user_tg_id || !sec) {
      return NextResponse.json(
        {
          success: false,
          message: "user_tg_id and sec are required",
        },
        { status: 400 }
      );
    }

    const new_status = await setSec(String(user_tg_id), String(sec));

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
