import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { PASSWORD_HASH_ROUNDS } from "@/lib/auth/constants";
import { registerSchema } from "@/lib/auth/validation";
import { rateLimit } from "@/lib/rate-limit";
import { issueEmailVerificationCode } from "@/lib/auth/email-verification";
import { saveProfilePhoto } from "@/lib/auth/profile-photo";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isBrowserForm =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const formData = isBrowserForm ? await request.formData() : null;
  const input = formData
    ? Object.fromEntries(formData)
    : await request.json().catch(() => null);
  const failure = (error: string, status: number) => {
    if (isBrowserForm && !wantsJson) {
      const url = new URL("/customer/register", request.nextUrl.origin);
      url.searchParams.set("error", error);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error }, { status });
  };
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`register:${ip}`, 5, 60_000))
    return failure("Too many attempts. Try again shortly.", 429);
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the submitted details.";
    return failure(message, 400);
  }
  const { fullName, email, phone, password } = parsed.data;
  const names = fullName.trim().split(/\s+/);
  const firstName = names.shift()!;
  const lastName = names.join(" ");
  const duplicate = await db.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true },
  });
  if (duplicate)
    return failure(
      "An account with this email or phone already exists. Sign in to continue verification.",
      409,
    );
  let profilePhotoUrl: string | null = null;
  let profilePhotoPublicId: string | null = null;
  try {
    const profilePhoto = await saveProfilePhoto(
      formData?.get("profilePhoto") instanceof File
        ? (formData.get("profilePhoto") as File)
        : null,
    );
    profilePhotoUrl = profilePhoto?.url ?? null;
    profilePhotoPublicId = profilePhoto?.publicId ?? null;
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Invalid profile photo.", 400);
  }
  let user;
  try {
    user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        profilePhotoUrl,
        profilePhotoPublicId,
        emailVerifiedAt: null,
        passwordHash: await hash(password, PASSWORD_HASH_ROUNDS),
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return failure(
        "An account with this email or phone already exists. Sign in to continue verification.",
        409,
      );
    throw error;
  }
  await createSession(user);
  const delivery = await issueEmailVerificationCode({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
  });
  if (!delivery.ok) {
    console.warn("Email verification delivery failed during registration", {
      userId: user.id,
      error: delivery.error,
    });
  }
  const landingPath = `/customer/verify-email?delivery=${delivery.ok ? "sent" : "failed"}`;
  if (isBrowserForm && !wantsJson)
    return NextResponse.redirect(new URL(landingPath, request.nextUrl.origin), 303);
  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        redirectTo: landingPath,
        emailSent: delivery.ok,
      },
    },
    { status: 201 },
  );
}
