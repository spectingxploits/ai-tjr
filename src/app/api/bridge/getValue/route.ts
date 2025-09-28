import { NextResponse } from "next/server";
import { getBridgeValue } from "@/services/db/bridge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "token is required" },
      { status: 400 }
    );
  }

  try {
    const res = await getBridgeValue(String(token));

    if (res === undefined) {
      return NextResponse.json(
        { ok: false, error: "unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      value: res.value,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
