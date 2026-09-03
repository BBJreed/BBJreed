import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  type: z
    .enum(["course", "book", "certification", "project", "mentorship", "other"])
    .default("course"),
  resourceUrl: z.string().url().optional().or(z.literal("")).nullable(),
  notes: z.string().default(""),
  goalId: z.string().optional().nullable(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.learningPathItem.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { orderIndex: "asc" }],
    include: { goal: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const count = await prisma.learningPathItem.count({ where: { userId } });
  const { resourceUrl, ...rest } = parsed.data;
  const item = await prisma.learningPathItem.create({
    data: { ...rest, resourceUrl: resourceUrl || null, userId, orderIndex: count },
  });
  return NextResponse.json({ item }, { status: 201 });
}
