import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { customerProfileSchema } from "@/lib/auth/validation";
import { saveProfilePhoto } from "@/lib/auth/profile-photo";
import { issueEmailVerificationCode } from "@/lib/auth/email-verification";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user || user.role !== "CUSTOMER")
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!rateLimit(`customer-profile:${user.id}`, 10, 10 * 60_000))
    return NextResponse.json({ error: "Too many profile changes. Try again later." }, { status: 429 });

  const formData = await request.formData();
  const parsed = customerProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your profile details." }, { status: 400 });
  const duplicate = await db.user.findFirst({
    where: { id: { not: user.id }, OR: [{ email: parsed.data.email }, { phone: parsed.data.phone }] },
    select: { id: true },
  });
  if (duplicate)
    return NextResponse.json({ error: "That email address or phone number is already in use." }, { status: 409 });

  const names = parsed.data.fullName.trim().split(/\s+/);
  const firstName = names.shift()!;
  const lastName = names.join(" ");
  const photo = formData.get("profilePhoto");
  let profilePhotoUrl: string | null | undefined;
  try {
    profilePhotoUrl = photo instanceof File && photo.size > 0 ? await saveProfilePhoto(photo) : undefined;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid profile photo." }, { status: 400 });
  }
  const emailChanged = parsed.data.email !== user.email;
  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
        ...(emailChanged ? { emailVerifiedAt: null } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json({ error: "That email address or phone number is already in use." }, { status: 409 });
    throw error;
  }
  if (emailChanged) {
    const sent = await issueEmailVerificationCode({ userId: user.id, email: parsed.data.email, firstName });
    return NextResponse.json({
      saved: true,
      emailVerificationRequired: true,
      emailSent: sent.ok,
      redirectTo: `/customer/verify-email?delivery=${sent.ok ? "sent" : "failed"}`,
    });
  }
  return NextResponse.json({ saved: true });
}
