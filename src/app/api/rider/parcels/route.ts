import { NextResponse } from "next/server";
import { getRider } from "@/lib/rider";
import { getRiderParcelDashboardData } from "@/lib/rider-parcels";

export async function GET() {
  const context = await getRider();
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  return NextResponse.json(
    await getRiderParcelDashboardData(context.user.id),
  );
}
