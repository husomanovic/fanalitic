import { Suspense } from "react";
import ReviewByTicket from "../../../components/ReviewByTicket";

export default function ReviewByTicketPage() {
  return (
    <Suspense fallback={<FormShell />}>
      <ReviewByTicket />
    </Suspense>
  );
}

function FormShell() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 py-8">
      <div
        className="h-40 animate-pulse rounded-3xl"
        style={{ background: "var(--surface)" }}
      />
    </main>
  );
}
