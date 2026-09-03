"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/assistant", label: "Assistant" },
  { href: "/notes", label: "Notepad" },
  { href: "/goals", label: "Goals" },
  { href: "/learning-path", label: "Learning Path" },
  { href: "/finance", label: "Financial Advisor" },
  { href: "/connections", label: "Connections" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-black/10 bg-white p-4">
      <div className="mb-6 text-lg font-semibold text-accent">Your Assistant</div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm ${
              pathname === link.href
                ? "bg-accent/10 font-medium text-accent"
                : "text-ink/80 hover:bg-black/5"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-black/10 pt-3 text-xs text-ink/60">
        <div className="mb-2 truncate">{session.user?.email}</div>
        <button className="btn-secondary w-full" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
