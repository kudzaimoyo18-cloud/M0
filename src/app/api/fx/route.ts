import { NextResponse } from "next/server";
import { getRate, SUPPORTED_CURRENCIES, type Currency } from "@/lib/currency";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get("target") as Currency | null;
  if (!target || !SUPPORTED_CURRENCIES.includes(target)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }
  const rate = await getRate(target);
  return NextResponse.json(
    { target, rate },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
  );
}
