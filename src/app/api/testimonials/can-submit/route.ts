import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_LESSONS_COMPLETED = 5;

/**
 * GET /api/testimonials/can-submit
 * Indica si el usuario autenticado puede enviar un testimonio.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ canSubmit: false, reason: "no-auth" });
  }

  try {
    const [progressCount, existing] = await Promise.all([
      prisma.progress.count({ where: { userId: session.user.id } }),
      prisma.testimonial.findFirst({
        where: { userId: session.user.id },
        select: { id: true, approved: true },
      }),
    ]);

    if (existing) {
      return NextResponse.json({
        canSubmit: false,
        reason: "already-submitted",
        approved: existing.approved,
      });
    }

    if (progressCount < MIN_LESSONS_COMPLETED) {
      return NextResponse.json({
        canSubmit: false,
        reason: "insufficient-progress",
        required: MIN_LESSONS_COMPLETED,
        current: progressCount,
      });
    }

    return NextResponse.json({ canSubmit: true });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error comprobando can-submit:", e);
    }
    return NextResponse.json({ canSubmit: false, reason: "error" });
  }
}
