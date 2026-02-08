import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAppConfigNumber,
  DEFAULT_MIN_LESSONS_TESTIMONIAL,
} from "@/lib/app-config";

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

    const minLessons = await getAppConfigNumber(
      "min_lessons_testimonial",
      DEFAULT_MIN_LESSONS_TESTIMONIAL
    );
    if (progressCount < minLessons) {
      return NextResponse.json({
        canSubmit: false,
        reason: "insufficient-progress",
        required: minLessons,
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
