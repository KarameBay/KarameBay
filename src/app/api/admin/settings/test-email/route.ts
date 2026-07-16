import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { sendTestEmail } from "@/lib/order-notifications";

const schema = z.object({
  recipientEmail: z.string().trim().email().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser("ADMIN");
  if (!user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid test email request" },
      { status: 400 },
    );

  const recipientEmail = parsed.data.recipientEmail ?? "kwizerapieron03@gmail.com";
  const result = await sendTestEmail(recipientEmail);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error ?? "Could not send the test email." },
      { status: 502 },
    );
  return NextResponse.json({ ok: true, recipientEmail });
}
