import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Server-side helper: the signed-in user's id, or null. Use in route handlers
 * and server components — every API route in this app scopes its Prisma
 * queries by this id, so one user never sees another user's data. */
export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
