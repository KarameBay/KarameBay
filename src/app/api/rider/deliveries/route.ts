import { NextResponse } from "next/server";
import { getRider, getRiderDashboardData } from "@/lib/rider";

export async function GET() {
  const context = await getRider();
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  return NextResponse.json(await getRiderDashboardData(context.user.id));
}
