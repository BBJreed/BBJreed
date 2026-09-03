import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const bodySchema = z.object({ text: z.string().min(1).max(20000) });

/**
 * Bring memory in from elsewhere — paste a JSON export from another AI tool
 * ([{"key":"...","value":"..."}] or [{"fact":"..."}]) or just plain text
 * (one fact per line). This is the "connect with my other AI" bridge: there's
 * no live API integration with any specific assistant here, just a common
 * landing format they can all export to or be copy-pasted from.
 */
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entries: Array<{ key: string; value: string }> = [];

  try {
    const json = JSON.parse(parsed.data.text);
    if (Array.isArray(json)) {
      json.forEach((item, i) => {
        if (typeof item === "string") {
          entries.push({ key: `imported_${i}`, value: item });
        } else if (item && typeof item === "object") {
          const key = "key" in item ? String(item.key) : `imported_${i}`;
          const value = "value" in item ? String(item.value) : "fact" in item ? String(item.fact) : null;
          if (value) entries.push({ key, value });
        }
      });
    }
  } catch {
    // Not JSON — treat as plain text, one fact per non-empty line.
    parsed.data.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, i) => entries.push({ key: `imported_${Date.now()}_${i}`, value: line }));
  }

  for (const entry of entries) {
    await prisma.memoryFact.upsert({
      where: { userId_key: { userId, key: entry.key } },
      update: { value: entry.value, source: "imported" },
      create: { userId, key: entry.key, value: entry.value, source: "imported" },
    });
  }

  return NextResponse.json({ imported: entries.length });
}
