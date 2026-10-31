import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  return NextResponse.json(
    {
      error: "Realtime auth is not configured in this unified build.",
    },
    { status: 501 },
  );
}
