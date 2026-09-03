import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const upsertSchema = z.object({
  category: z.string().min(1).max(50),
  monthlyLimit: z.number().positive(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const budgets = await prisma.budget.findMany({ where: { userId }, orderBy: { category: "asc" } });
  return NextResponse.json({ budgets });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId, category: parsed.data.category } },
    update: { monthlyLimit: parsed.data.monthlyLimit },
    create: { ...parsed.data, userId },
  });
  return NextResponse.json({ budget }, { status: 201 });
}
