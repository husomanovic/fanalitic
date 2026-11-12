import { Suspense } from "react";
import TicketEntry from "../../components/TicketEntry";

export const metadata = {
  title: "FanAnalitic — Enter ticket code",
  description: "Enter or scan your FANLYTICS ticket code to leave a matchday review.",
};

export default function FanlyticsTicketPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell mx-auto flex min-h-full w-full max-w-6xl flex-col">
          <div className="panel h-48 animate-pulse" />
        </main>
      }
    >
      <TicketEntry />
    </Suspense>
  );
}
