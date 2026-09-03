"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  title: string;
  type: string;
  status: "planned" | "in_progress" | "done";
  resourceUrl: string | null;
  notes: string;
  goal: { id: string; title: string } | null;
};

type Goal = { id: string; title: string; category: string };

const types = ["course", "book", "certification", "project", "mentorship", "other"];
const statusOrder: Item["status"][] = ["in_progress", "planned", "done"];

export default function LearningPathPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("course");
  const [goalId, setGoalId] = useState("");

  async function load() {
    const [itemsRes, goalsRes] = await Promise.all([
      fetch("/api/learning-path"),
      fetch("/api/goals"),
    ]);
    if (itemsRes.ok) setItems((await itemsRes.json()).items);
    if (goalsRes.ok) {
      const data = await goalsRes.json();
      setGoals(data.goals.filter((g: { category: string }) => g.category === "career" || g.category === "learning"));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/learning-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, goalId: goalId || null }),
    });
    if (res.ok) {
      setTitle("");
      load();
    }
  }

  async function setStatus(item: Item, status: Item["status"]) {
    await fetch(`/api/learning-path/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/learning-path/${id}`, { method: "DELETE" });
    load();
  }

  const sorted = [...items].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Career Learning Path</h1>
      <p className="mt-1 text-sm text-ink/60">
        The courses, certs, and projects between you and your career goals. Link an
        item to a goal so your assistant can connect the two.
      </p>

      <form onSubmit={createItem} className="card mt-6 flex flex-col gap-3">
        <input
          className="input"
          placeholder="e.g. AWS Solutions Architect certification"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex gap-3">
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">No linked goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
        <button className="btn self-start" type="submit">
          Add to path
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {loading && <p className="text-sm text-ink/50">Loading…</p>}
        {!loading && sorted.length === 0 && (
          <p className="text-sm text-ink/50">Nothing planned yet — add your first item above.</p>
        )}
        {sorted.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  {item.type}
                </span>
                <h3 className="mt-1 font-medium">{item.title}</h3>
                {item.goal && (
                  <p className="text-xs text-ink/50">Toward: {item.goal.title}</p>
                )}
              </div>
              <button className="btn-secondary text-xs" onClick={() => remove(item.id)}>
                Delete
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              {(["planned", "in_progress", "done"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(item, s)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    item.status === s ? "bg-accent text-white" : "bg-black/5 text-ink/70"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
