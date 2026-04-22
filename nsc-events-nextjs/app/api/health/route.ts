import { NextResponse } from "next/server";

// Verifiable frontend health testing endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
