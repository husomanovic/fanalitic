"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button type="button" onClick={logout} disabled={pending} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-fg hover:border-brand hover:text-brand disabled:opacity-60">
        {pending ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
