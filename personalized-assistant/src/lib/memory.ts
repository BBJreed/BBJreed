import { prisma } from "@/lib/db";
import { getAnthropicClient, ASSISTANT_MODEL } from "@/lib/anthropic";

/**
 * Pulls together everything the app knows about a user — notes, goals,
 * learning path, a financial snapshot, and standing MemoryFacts — into one
 * compact block of text. This is what makes the assistant "know" the user
 * instead of starting cold on every message: it's injected as context on
 * every /assistant/chat call.
 */
export async function buildUserContext(userId: string): Promise<string> {
  const [goals, learningItems, notes, facts, accounts, budgets, recentTx] =
    await Promise.all([
      prisma.goal.findMany({
        where: { userId, status: "active" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.learningPathItem.findMany({
        where: { userId, status: { not: "done" } },
        orderBy: { orderIndex: "asc" },
        take: 10,
      }),
      prisma.note.findMany({
        where: { userId },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        take: 5,
      }),
      prisma.memoryFact.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
      prisma.financialAccount.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 25,
      }),
    ]);

  const sections: string[] = [];

  if (facts.length) {
    sections.push(
      "Known facts about the user:\n" +
        facts.map((f) => `- ${f.key}: ${f.value} (source: ${f.source})`).join("\n")
    );
  }

  if (goals.length) {
    sections.push(
      "Active goals:\n" +
        goals
          .map(
            (g) =>
              `- [${g.category}] ${g.title} — ${g.progress}% done${
                g.targetDate ? `, target ${g.targetDate.toISOString().slice(0, 10)}` : ""
              }${g.description ? `: ${g.description}` : ""}`
          )
          .join("\n")
    );
  }

  if (learningItems.length) {
    sections.push(
      "Career / learning path (not yet done):\n" +
        learningItems
          .map((l) => `- (${l.status}) [${l.type}] ${l.title}${l.notes ? ` — ${l.notes}` : ""}`)
          .join("\n")
    );
  }

  if (notes.length) {
    sections.push(
      "Recent / pinned notes:\n" +
        notes
          .map((n) => `- ${n.pinned ? "📌 " : ""}${n.title}: ${n.content.slice(0, 200)}`)
          .join("\n")
    );
  }

  if (accounts.length) {
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const income = recentTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spend = recentTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    sections.push(
      `Financial snapshot: ${accounts.length} account(s), net balance ~$${totalBalance.toFixed(
        2
      )}. Last ${recentTx.length} transactions: +$${income.toFixed(2)} in, $${Math.abs(
        spend
      ).toFixed(2)} out.` +
        (budgets.length
          ? "\nBudgets:\n" +
            budgets.map((b) => `- ${b.category}: limit $${b.monthlyLimit.toFixed(2)}/mo`).join("\n")
          : "")
    );
  }

  if (!sections.length) {
    return "The user hasn't added any notes, goals, learning items, or financial accounts yet. Ask what they want to work on first.";
  }

  return sections.join("\n\n");
}

/**
 * Best-effort fact extraction: asks Claude for a short JSON list of durable
 * facts worth remembering from this exchange (e.g. "wants to become a
 * senior engineer by 2027", "pays $1800/mo rent"). This is intentionally
 * fire-and-forget — a failure here should never break the chat response
 * the user is waiting on.
 */
export async function extractAndStoreFacts(
  userId: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  const client = getAnthropicClient();
  if (!client) return;

  try {
    const res = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 300,
      system:
        "Extract at most 3 durable facts about the user worth remembering long-term " +
        "(goals, preferences, constraints, life/career/financial details) from this " +
        'exchange. Respond with ONLY a JSON array like [{"key":"...","value":"..."}]. ' +
        "Use short, stable keys (e.g. \"career_target_role\", \"monthly_rent\"). " +
        "If nothing durable was said, respond with [].",
      messages: [
        { role: "user", content: `User said: ${userMessage}\n\nAssistant replied: ${assistantReply}` },
      ],
    });

    const text = res.content
      .filter((block): block is Anthropic_TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const facts = JSON.parse(jsonMatch[0]) as Array<{ key?: string; value?: string }>;
    for (const fact of facts) {
      if (!fact.key || !fact.value) continue;
      await prisma.memoryFact.upsert({
        where: { userId_key: { userId, key: fact.key } },
        update: { value: fact.value, source: "chat" },
        create: { userId, key: fact.key, value: fact.value, source: "chat" },
      });
    }
  } catch {
    // Non-fatal: memory extraction is a nice-to-have, not a chat blocker.
  }
}

// Minimal structural type so we don't import the SDK's block union just for
// the narrowing filter above.
type Anthropic_TextBlock = { type: "text"; text: string };
