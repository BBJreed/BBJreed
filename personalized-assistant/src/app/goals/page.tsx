"use client";

import { useEffect, useState } from "react";

type Goal = {
  id: string;
  title: string;
  description: string;
  category: "career" | "financial" | "health" | "personal" | "learning";
  status: "active" | "completed" | "archived";
  progress: number;
  targetDate: string | null;
};

const categories: Goal["category"][] = ["career", "financial", "health", "personal", "learning"];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Goal["category"]>("career");
  const [targetDate, setTargetDate] = useState("");

  async function load() {
    const res = await fetch("/api/goals");
    if (res.ok) setGoals((await res.json()).goals);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, targetDate: targetDate || null }),
    });
    if (res.ok) {
      setTitle("");
      setTargetDate("");
      load();
    }
  }

  async function setProgress(goal: Goal, progress: number) {
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress,
        status: progress >= 100 ? "completed" : "active",
      }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <p className="mt-1 text-sm text-ink/60">
        Active goals feed directly into your assistant's context and shape what it
        suggests in the Learning Path and Financial Advisor.
      </p>

      <form onSubmit={createGoal} className="card mt-6 flex flex-col gap-3">
        <input
          className="input"
          placeholder="e.g. Get promoted to senior engineer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex gap-3">
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as Goal["category"])}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <button className="btn self-start" type="submit">
          Add goal
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {loading && <p className="text-sm text-ink/50">Loading…</p>}
        {!loading && goals.length === 0 && (
          <p className="text-sm text-ink/50">No goals yet — set your first one above.</p>
        )}
        {goals.map((goal) => (
          <div key={goal.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  {goal.category}
                </span>
                <h3 className="mt-1 font-medium">{goal.title}</h3>
                {goal.targetDate && (
                  <p className="text-xs text-ink/50">
                    Target: {goal.targetDate.slice(0, 10)}
                  </p>
                )}
              </div>
              <button className="btn-secondary text-xs" onClick={() => remove(goal.id)}>
                Delete
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={goal.progress}
                onChange={(e) => setProgress(goal, Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm text-ink/70">{goal.progress}%</span>
            </div>
            {goal.status === "completed" && (
              <p className="mt-1 text-xs font-medium text-green-600">Completed 🎉</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
