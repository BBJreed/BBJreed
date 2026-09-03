"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string };

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/assistant/chat")
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: text }]);

    const res = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { id: `local-reply-${Date.now()}`, role: "assistant", content: data.reply },
    ]);
    setSending(false);
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <h1 className="text-2xl font-semibold">Assistant</h1>
      <p className="mt-1 text-sm text-ink/60">
        Knows your active goals, learning path, pinned notes, and financial snapshot.
      </p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-ink/50">
            Ask about your goals, get a study plan for your next learning item, or ask
            for financial advice — try "what should I focus on this week?"
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "ml-auto bg-accent text-white" : "card"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <p className="text-xs text-ink/40">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2 border-t border-black/10 pt-4">
        <input
          className="input"
          placeholder="Message your assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn" type="submit" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
