import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  financialAccountId: z.string(),
  description: z.string().min(1).max(200),
  amount: z.number(), // positive = income, negative = expense
  category: z.string().default("uncategorized"),
  date: z.string().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 100,
    include: { financialAccount: { select: { name: true } } },
  });
  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.financialAccount.findFirst({
    where: { id: parsed.data.financialAccountId, userId },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { date, ...rest } = parsed.data;

  // Keep the account balance and its transaction history consistent in one
  // transaction rather than trusting two separate writes to both land.
  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: { ...rest, userId, date: date ? new Date(date) : new Date() },
    }),
    prisma.financialAccount.update({
      where: { id: account.id },
      data: { balance: account.balance + parsed.data.amount },
    }),
  ]);

  return NextResponse.json({ transaction }, { status: 201 });
}
