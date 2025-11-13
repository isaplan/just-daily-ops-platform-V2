import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, message: "Direct master sync endpoint" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}