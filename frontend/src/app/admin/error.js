"use client";

import Link from "next/link";

export default function AdminError({ retry }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Unable to load this page</h1>
      <p role="alert" className="text-sm text-muted">We could not verify your session. Please try again.</p>
      <button type="button" onClick={retry} className="rounded-lg bg-brand px-4 py-2 font-semibold text-on-brand">Try again</button>
      <Link href="/login" className="text-sm text-brand underline">Back to sign in</Link>
    </main>
  );
}
