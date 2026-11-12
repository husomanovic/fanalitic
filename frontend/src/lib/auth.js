import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// React cache only deduplicates within this render; sessions are never cached across users.
export const requireAdmin = cache(async () => {
  const token = (await cookies()).get("fanalitic_session")?.value;
  if (!token) redirect("/login");
  const backend = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  let response;
  try {
    response = await fetch(`${backend}/api/auth/me`, {
      headers: { Cookie: `fanalitic_session=${encodeURIComponent(token)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("Unable to verify your session. Please try again later.");
  }
  if (response.status === 401 || response.status === 403) redirect("/login");
  if (!response.ok) throw new Error("Unable to verify your session. Please try again later.");
  const { user } = await response.json();
  if (!user || user.role !== "admin") redirect("/login");
  return user;
});
