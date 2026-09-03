import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

/**
 * Deterministic, rule-based financial insights — no LLM call required, so
 * this works even without an ANTHROPIC_API_KEY configured. The assistant
 * chat can layer richer, conversational advice on top of this via the
 * context built in lib/memory.ts.
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [accounts, budgets, recentTransactions] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: thirtyDaysAgo } } }),
  ]);

  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const income = recentTransactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = Math.abs(
    recentTransactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  );
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : null;

  const spendByCategory: Record<string, number> = {};
  for (const t of recentTransactions) {
    if (t.amount < 0) {
      spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + Math.abs(t.amount);
    }
  }

  const insights: string[] = [];

  for (const budget of budgets) {
    const spent = spendByCategory[budget.category] ?? 0;
    if (spent > budget.monthlyLimit) {
      insights.push(
        `Over budget on "${budget.category}": $${spent.toFixed(2)} spent vs a $${budget.monthlyLimit.toFixed(
          2
        )} limit (last 30 days).`
      );
    } else if (spent > budget.monthlyLimit * 0.85) {
      insights.push(
        `Close to your "${budget.category}" budget: $${spent.toFixed(2)} of $${budget.monthlyLimit.toFixed(
          2
        )} used.`
      );
    }
  }

  if (savingsRate !== null) {
    if (savingsRate < 0) {
      insights.push("You spent more than you brought in over the last 30 days.");
    } else if (savingsRate < 10) {
      insights.push(`Savings rate is ${savingsRate.toFixed(0)}% — most guidance targets 15-20%+.`);
    } else {
      insights.push(`Savings rate is a healthy ${savingsRate.toFixed(0)}% over the last 30 days.`);
    }
  }

  if (accounts.length === 0) {
    insights.push("No accounts added yet — add one to start tracking your financial picture.");
  }

  return NextResponse.json({
    netWorth,
    income,
    expenses,
    savingsRate,
    spendByCategory,
    insights,
  });
}
