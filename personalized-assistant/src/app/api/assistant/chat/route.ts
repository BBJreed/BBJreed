import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getAnthropicClient, ASSISTANT_MODEL } from "@/lib/anthropic";
import { buildUserContext, extractAndStoreFacts } from "@/lib/memory";

const SYSTEM_PROMPT = `You are a personal assistant, mentor, and financial advisor for one
specific person. You have standing context below about their notes, goals, career
learning path, and finances — use it, don't ask them to repeat it. Be direct and
concrete: name the specific goal, budget category, or learning item you're
referencing rather than speaking generically. When you don't have enough context
to give real advice, say what you'd need to know rather than guessing.`;

const bodySchema = z.object({ message: z.string().min(1).max(4000) });

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.assistantMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { message } = parsed.data;

  await prisma.assistantMessage.create({ data: { userId, role: "user", content: message } });

  const client = getAnthropicClient();
  if (!client) {
    const fallback =
      "ANTHROPIC_API_KEY isn't configured yet, so I can't actually respond. Add it to " +
      ".env and restart the server — see the README for setup.";
    await prisma.assistantMessage.create({ data: { userId, role: "assistant", content: fallback } });
    return NextResponse.json({ reply: fallback });
  }

  const [context, history] = await Promise.all([
    buildUserContext(userId),
    prisma.assistantMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const orderedHistory = history.reverse();

  try {
    const response = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n---\n${context}`,
      messages: orderedHistory.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
    });

    const reply = response.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");

    await prisma.assistantMessage.create({ data: { userId, role: "assistant", content: reply } });

    // Fire-and-forget: don't make the user wait on fact extraction.
    extractAndStoreFacts(userId, message, reply).catch(() => {});

    return NextResponse.json({ reply });
  } catch (err) {
    const errorReply = "The assistant call failed — check ANTHROPIC_API_KEY and try again.";
    await prisma.assistantMessage.create({ data: { userId, role: "assistant", content: errorReply } });
    return NextResponse.json({ reply: errorReply, error: String(err) }, { status: 502 });
  }
}
