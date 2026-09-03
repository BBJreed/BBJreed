"use client";

import { useEffect, useState } from "react";

type Account = { id: string; name: string; type: string; balance: number };
type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  financialAccount: { name: string };
};
type Summary = {
  netWorth: number;
  income: number;
  expenses: number;
  savingsRate: number | null;
  insights: string[];
};

export default function FinancePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [accName, setAccName] = useState("");
  const [accBalance, setAccBalance] = useState("");

  const [txAccountId, setTxAccountId] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");

  async function load() {
    const [accRes, txRes, summaryRes] = await Promise.all([
      fetch("/api/finance/accounts"),
      fetch("/api/finance/transactions"),
      fetch("/api/finance/summary"),
    ]);
    if (accRes.ok) setAccounts((await accRes.json()).accounts);
    if (txRes.ok) setTransactions((await txRes.json()).transactions);
    if (summaryRes.ok) setSummary(await summaryRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accName.trim()) return;
    const res = await fetch("/api/finance/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: accName, balance: Number(accBalance) || 0 }),
    });
    if (res.ok) {
      setAccName("");
      setAccBalance("");
      load();
    }
  }

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!txAccountId || !txDesc.trim() || !txAmount) return;
    const res = await fetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        financialAccountId: txAccountId,
        description: txDesc,
        amount: Number(txAmount),
        category: txCategory || "uncategorized",
      }),
    });
    if (res.ok) {
      setTxDesc("");
      setTxAmount("");
      setTxCategory("");
      load();
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Financial Advisor</h1>
      <p className="mt-1 text-sm text-ink/60">
        Manual accounts and transactions today — see the project README for the plan
        to wire up live bank sync via Plaid.
      </p>

      {summary && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card">
            <div className="text-xs uppercase text-ink/50">Net balance</div>
            <div className="mt-1 text-lg font-semibold">${summary.netWorth.toFixed(2)}</div>
          </div>
          <div className="card">
            <div className="text-xs uppercase text-ink/50">Last 30 days</div>
            <div className="mt-1 text-lg font-semibold">
              +${summary.income.toFixed(2)} / -${summary.expenses.toFixed(2)}
            </div>
          </div>
          <div className="card">
            <div className="text-xs uppercase text-ink/50">Savings rate</div>
            <div className="mt-1 text-lg font-semibold">
              {summary.savingsRate !== null ? `${summary.savingsRate.toFixed(0)}%` : "—"}
            </div>
          </div>
        </div>
      )}

      {summary && summary.insights.length > 0 && (
        <div className="card mt-4">
          <h2 className="font-medium">Insights</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-ink/80">
            {summary.insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-medium">Accounts</h2>
          <form onSubmit={addAccount} className="card mt-2 flex flex-col gap-2">
            <input
              className="input"
              placeholder="Account name"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Starting balance"
              type="number"
              value={accBalance}
              onChange={(e) => setAccBalance(e.target.value)}
            />
            <button className="btn self-start" type="submit">
              Add account
            </button>
          </form>
          <div className="mt-3 flex flex-col gap-2">
            {!loading && accounts.length === 0 && (
              <p className="text-sm text-ink/50">No accounts yet.</p>
            )}
            {accounts.map((a) => (
              <div key={a.id} className="card flex justify-between text-sm">
                <span>{a.name}</span>
                <span className="font-medium">${a.balance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-medium">Log a transaction</h2>
          <form onSubmit={addTransaction} className="card mt-2 flex flex-col gap-2">
            <select className="input" value={txAccountId} onChange={(e) => setTxAccountId(e.target.value)}>
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Description"
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
            />
            <input
              className="input"
              placeholder="Amount (negative = expense)"
              type="number"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
            />
            <input
              className="input"
              placeholder="Category (e.g. rent, groceries)"
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
            />
            <button className="btn self-start" type="submit">
              Add transaction
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-medium">Recent transactions</h2>
        <div className="mt-2 flex flex-col gap-2">
          {!loading && transactions.length === 0 && (
            <p className="text-sm text-ink/50">No transactions logged yet.</p>
          )}
          {transactions.map((t) => (
            <div key={t.id} className="card flex items-center justify-between text-sm">
              <div>
                <div>{t.description}</div>
                <div className="text-xs text-ink/50">
                  {t.financialAccount.name} · {t.category} · {t.date.slice(0, 10)}
                </div>
              </div>
              <span className={t.amount < 0 ? "text-red-600" : "text-green-600"}>
                {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
