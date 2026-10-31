import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true }, { status: 200 });
}
