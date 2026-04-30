"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";

export default function ManageBillingButton({ isPastDue }: { isPastDue: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
        return;
      }

      alert(data.error ?? "Something went wrong.");
      setLoading(false);
    } catch {
      alert("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "9px 0",
        borderRadius: "var(--r-sm)",
        background: isPastDue ? "var(--red)" : "transparent",
        border: isPastDue ? "none" : "1px solid var(--border-normal)",
        color: isPastDue ? "#fff" : "var(--text-2)",
        fontSize: 12,
        fontWeight: isPastDue ? 700 : 500,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : null}
      {loading ? "Loading..." : isPastDue ? "Fix payment" : "Manage billing"} <ExternalLink size={11} />
    </button>
  );
}
