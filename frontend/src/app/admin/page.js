import dynamic from "next/dynamic";
import styles from "@/components/Admin.module.css";

const AnalyticsBoard = dynamic(() => import("@/components/charts/AnalyticsBoard"), {
  loading: () => <p className={styles.pageLead}>Loading charts…</p>,
});

export const metadata = {
  title: "Dashboard | FanAnalitic",
};

export default function DashboardPage() {
  return (
    <section>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageLead}>
        Match ratings, review volume, and stadium sections from the analytics API.
      </p>
      <AnalyticsBoard />
    </section>
  );
}
