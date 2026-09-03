"use client";

import { useEffect, useState } from "react";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string;
  pinned: boolean;
  updatedAt: string;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    const res = await fetch("/api/notes");
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      setTitle("");
      setContent("");
      load();
    }
  }

  async function togglePin(note: Note) {
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Notepad</h1>
      <p className="mt-1 text-sm text-ink/60">
        Quick capture. Pinned notes are given to your assistant as context on every chat.
      </p>

      <form onSubmit={createNote} className="card mt-6 flex flex-col gap-3">
        <input
          className="input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input min-h-[100px]"
          placeholder="Write something..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button className="btn self-start" type="submit">
          Add note
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {loading && <p className="text-sm text-ink/50">Loading…</p>}
        {!loading && notes.length === 0 && (
          <p className="text-sm text-ink/50">No notes yet — add your first one above.</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">
                {note.pinned && "📌 "}
                {note.title}
              </h3>
              <div className="flex gap-2 text-xs">
                <button className="btn-secondary" onClick={() => togglePin(note)}>
                  {note.pinned ? "Unpin" : "Pin"}
                </button>
                <button className="btn-secondary" onClick={() => remove(note.id)}>
                  Delete
                </button>
              </div>
            </div>
            {note.content && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{note.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
