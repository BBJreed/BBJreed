import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SignInButtons } from "@/components/SignInButtons";
import Link from "next/link";

export default async function DashboardPage() {
  const userId = await requireUserId();

  if (!userId) {
    return (
      <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Your Personalized Assistant</h1>
          <p className="mt-2 text-sm text-ink/70">
            One place for notes, goals, a career learning path, and a financial
            advisor — with an assistant that reads across all of it to actually
            know your situation instead of starting cold every time.
          </p>
        </div>
        <SignInButtons
          google={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
          github={Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)}
        />
      </div>
    );
  }

  const [noteCount, activeGoals, nextLearningItem, accounts] = await Promise.all([
    prisma.note.count({ where: { userId } }),
    prisma.goal.findMany({ where: { userId, status: "active" }, orderBy: { updatedAt: "desc" } }),
    prisma.learningPathItem.findFirst({
      where: { userId, status: { not: "done" } },
      orderBy: { orderIndex: "asc" },
    }),
    prisma.financialAccount.findMany({ where: { userId } }),
  ]);

  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-ink/60">
        Your assistant pulls context from every card below — the more you fill in,
        the sharper its advice gets.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Notes" value={String(noteCount)} href="/notes" />
        <SummaryCard label="Active goals" value={String(activeGoals.length)} href="/goals" />
        <SummaryCard
          label="Next learning item"
          value={nextLearningItem?.title ?? "None planned"}
          href="/learning-path"
        />
        <SummaryCard
          label="Net balance"
          value={`$${netWorth.toFixed(2)}`}
          href="/finance"
        />
      </div>

      <div className="mt-8 card">
        <h2 className="font-medium">Talk to your assistant</h2>
        <p className="mt-1 text-sm text-ink/60">
          It already has your goals, learning path, notes, and financial snapshot
          as context — no need to re-explain your situation every time.
        </p>
        <Link href="/assistant" className="btn mt-3 inline-flex">
          Open assistant
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="card block transition hover:border-accent/40">
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </Link>
  );
}
