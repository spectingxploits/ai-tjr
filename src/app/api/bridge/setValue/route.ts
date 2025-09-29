import { NextResponse } from "next/server";
import { setBridgeValue } from "@/services/db/bridge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Request body:", body);
    const { token, value } = body;

    if (!token || value === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "token and value are required",
        },
        { status: 400 }
      );
    }

    const new_value = await setBridgeValue(String(token), String(value));

    if (!new_value) {
      return NextResponse.json(
        { ok: false, error: "unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, new_value });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
