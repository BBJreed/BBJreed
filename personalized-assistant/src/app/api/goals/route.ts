import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().default(""),
  category: z.enum(["career", "financial", "health", "personal", "learning"]).default("personal"),
  targetDate: z.string().optional().nullable(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { targetDate, ...rest } = parsed.data;
  const goal = await prisma.goal.create({
    data: { ...rest, userId, targetDate: targetDate ? new Date(targetDate) : null },
  });
  return NextResponse.json({ goal }, { status: 201 });
}
