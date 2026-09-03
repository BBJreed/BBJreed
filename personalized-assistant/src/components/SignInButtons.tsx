"use client";

import { signIn } from "next-auth/react";

export function SignInButtons({
  google,
  github,
}: {
  google: boolean;
  github: boolean;
}) {
  if (!google && !github) {
    return (
      <p className="text-sm text-ink/60">
        No OAuth provider is configured yet. Set <code>GOOGLE_CLIENT_ID</code>/
        <code>GOOGLE_CLIENT_SECRET</code> or <code>GITHUB_CLIENT_ID</code>/
        <code>GITHUB_CLIENT_SECRET</code> in <code>.env</code> and restart the dev server.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {google && (
        <button className="btn" onClick={() => signIn("google")}>
          Continue with Google
        </button>
      )}
      {github && (
        <button className="btn-secondary" onClick={() => signIn("github")}>
          Continue with GitHub
        </button>
      )}
    </div>
  );
}
